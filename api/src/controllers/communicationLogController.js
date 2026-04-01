import communicationLogService from "../services/communicationLogService.js";

export const getCommunicationLogs = async (req, res, next) => {
  try {
    const result = await communicationLogService.getLogs(
      {
        channel: req.query.channel,
        status: req.query.status,
        search: req.query.search,
      },
      {
        page: req.query.page,
        limit: req.query.limit,
        sort: req.query.sort,
      }
    );

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
      summary: result.summary,
    });
  } catch (error) {
    next(error);
  }
};
