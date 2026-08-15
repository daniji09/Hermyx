import * as reportService from '../services/report.service.js';

// Get report by rid
export const getReport = async (req, res, next) => {
  try {
    const report = await reportService.getReport(req.params.rid);
    return res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};

// Get reports
export const getReports = async (req, res, next) => {
  try {
    const { reports, pagination } = await reportService.getReports({
      pagination: req.pagination,
      filters: {
        sortByDate: req.query.sortByDate,
        status: req.query.status,
        type: req.query.type,
      },
      userId: req.user.uid,
    });
    return res.status(200).json({ reports, pagination });
  } catch (error) {
    next(error);
  }
};

export const reportAdventurer = async (req, res, next) => {
  try {
    const report = await reportService.reportAdventurer({
      message: req.body.message,
      missionId: req.body.mid,
      sender: req.user,
      vacancyId: req.body.vacancyId,
    });
    return res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};

export const reportUser = async (req, res, next) => {
  try {
    const report = await reportService.reportUser({
      message: req.body.message,
      senderId: req.user.uid,
      userId: req.body.uid,
    });
    return res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};

export const reportMission = async (req, res, next) => {
  try {
    const report = await reportService.reportMission({
      message: req.body.message,
      missionId: req.body.mid,
      senderId: req.user.uid,
    });
    return res.status(200).json({ report });
  } catch (error) {
    next(error);
  }
};

export const acceptAdventurersWork = async (req, res, next) => {
  try {
    await reportService.acceptAdventurersWork({
      adminId: req.user.uid,
      reason: req.body.reason,
      reportId: req.params.rid,
    });
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

export const rejectAdventurersWork = async (req, res, next) => {
  try {
    await reportService.rejectAdventurersWork({
      adminId: req.user.uid,
      reason: req.body.reason,
      reportId: req.params.rid,
    });
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

export const dismiss = async (req, res, next) => {
  try {
    await reportService.dismiss({
      adminId: req.user.uid,
      reason: req.body.reason,
      reportId: req.params.rid,
    });
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};
