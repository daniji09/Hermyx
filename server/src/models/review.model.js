import pool from '../config/db.config.js';

const REVIEWABLE_PARTICIPATION_STATUSES = [
  'accepted',
  'in_dispute',
  'released',
];

export const createOwnerReview = async ({
  missionId,
  adventurerId,
  ownerId,
  rating,
  comment,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const participationResult = await client.query(
      `
        SELECT
          mp.id,
          mp.owner_review_id,
          mp.status AS participation_status,
          m.owner_id,
          m.status AS mission_status
        FROM mission_participation mp
        JOIN mission m ON m.mid = mp.mid
        WHERE mp.mid = $1
          AND mp.adventurer_id = $2
        FOR UPDATE OF mp
      `,
      [missionId, adventurerId],
    );
    const participation = participationResult.rows[0];

    if (!participation) {
      await client.query('ROLLBACK');
      return { error: 'participation_not_found' };
    }

    if (participation.owner_id !== ownerId) {
      await client.query('ROLLBACK');
      return { error: 'not_owner' };
    }

    if (
      !REVIEWABLE_PARTICIPATION_STATUSES.includes(
        participation.participation_status,
      )
    ) {
      await client.query('ROLLBACK');
      return { error: 'mission_not_completed' };
    }

    if (participation.owner_review_id) {
      await client.query('ROLLBACK');
      return { error: 'already_reviewed' };
    }

    const reviewResult = await client.query(
      `
        INSERT INTO review (rating, comment)
        VALUES ($1, NULLIF($2, ''))
        RETURNING *
      `,
      [rating, comment || ''],
    );
    const review = reviewResult.rows[0];

    await client.query(
      `
        UPDATE mission_participation
        SET owner_review_id = $1
        WHERE id = $2
      `,
      [review.id, participation.id],
    );

    await client.query(
      `
        UPDATE app_user
        SET rating = COALESCE((
          SELECT ROUND(AVG(r.rating)::numeric, 2)
          FROM mission_participation reviewed_mp
          JOIN review r ON r.id = reviewed_mp.owner_review_id
          WHERE reviewed_mp.adventurer_id = $1
        ), 0)
        WHERE uid = $1
      `,
      [adventurerId],
    );

    await client.query('COMMIT');
    return { review };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getAdventurerReviewsByUsername = async (username) => {
  const query = `
    SELECT
      r.id,
      r.rating,
      r.comment,
      r.created_at,
      m.mid AS mission_id,
      m.title AS mission_title,
      owner_user.uid AS owner_id,
      owner_user.username AS owner_username,
      owner_user.avatar AS owner_avatar,
      COUNT(*) OVER()::int AS total_reviews,
      ROUND(AVG(r.rating) OVER()::numeric, 2) AS average_rating
    FROM app_user adventurer
    JOIN mission_participation mp ON mp.adventurer_id = adventurer.uid
    JOIN review r ON r.id = mp.owner_review_id
    JOIN mission m ON m.mid = mp.mid
    JOIN app_user owner_user ON owner_user.uid = m.owner_id
    WHERE adventurer.username = $1
    ORDER BY r.created_at DESC
  `;
  const result = await pool.query(query, [username]);

  if (result.rows.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      reviews: [],
    };
  }

  const averageRating = Number(result.rows[0].average_rating);
  const totalReviews = Number(result.rows[0].total_reviews);
  const reviews = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { average_rating, total_reviews, ...review } = row;
    return review;
  });

  return {
    averageRating,
    totalReviews,
    reviews,
  };
};
