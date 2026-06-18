import { consts } from '@hermyx/shared';

export const pagination = () => (req, res, next) => {
  // Early exit if there is no pagination to be made
  if (!req.query.page || !req.query.limit) next();

  // Page and limit parameters
  const page = parseInt(req.query.page) || consts.PAGINATION.DEFAULT_PAGE;
  const limit = parseInt(req.query.limit) || consts.PAGINATION.DEFAULT_LIMIT;

  // Indexes for searching data correctly
  const offset = (page - 1) * limit;

  // Pagination object is build
  const pagination = { limit, page, offset };

  // Data and pagination is returned
  req.pagination = pagination;
  next();
};
