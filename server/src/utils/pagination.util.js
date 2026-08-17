import pool from '../config/db.config.js';

// For db queries that must returned paginated results
export const executePaginatedQuery = async (
  baseQuery,
  baseValues,
  pagination,
) => {
  let query = baseQuery;
  const values = [...baseValues];

  // Pagination is added dynamically
  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  // Query is executed
  const result = await pool.query(query, values);

  // Empty case is managed
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Total_count is cleaned
  const totalCount = parseInt(result.rows[0].total_count);
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...data } = row;
    return data;
  });

  return { rows, totalCount };
};
