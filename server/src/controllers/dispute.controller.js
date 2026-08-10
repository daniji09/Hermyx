import * as disputeService from '../services/dispute.service.js';

export const getMyDisputes = async (req, res, next) => {
  try {
    const disputes = await disputeService.getMyDisputes(req.user.uid);
    return res.status(200).json({ disputes });
  } catch (error) {
    next(error);
  }
};

export const getMyDisputeUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await disputeService.getMyDisputeUnreadCount(
      req.user.uid,
    );
    return res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

export const getDispute = async (req, res, next) => {
  try {
    const dispute = await disputeService.getDispute(
      req.params.id,
      req.user.uid,
    );
    return res.status(200).json({ dispute });
  } catch (error) {
    next(error);
  }
};
