import { consts } from '@hermyx/shared';
import pool from '../config/db.config.js';

// For db queries that must returned paginated results
export const executePaginatedQuery = async (
  baseQuery,
  baseValues,
  pagination,
) => {
  let query = baseQuery;
  const values = [...baseValues];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  const totalCount = Number(result.rows[0].total_count);
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...data } = row;
    return data;
  });

  return { rows, totalCount };
};

export const withDefaultPagination = (pagination) => {
  if (pagination) return pagination;

  const page = consts.PAGINATION.DEFAULT_PAGE;
  const limit = consts.PAGINATION.DEFAULT_LIMIT;
  return { page, limit, offset: (page - 1) * limit };
};

export const buildPagination = (pagination, totalItems) => {
  const normalizedTotalItems = Number(totalItems) || 0;
  const totalPages = Math.ceil(normalizedTotalItems / pagination.limit);

  return {
    currentPage: pagination.page,
    totalPages,
    totalItems: normalizedTotalItems,
    hasMore: pagination.page < totalPages,
  };
};
