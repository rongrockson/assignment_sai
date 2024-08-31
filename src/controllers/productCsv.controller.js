const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const productCsvService = require('../services/productCsv.service');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const uploadCsv = catchAsync(async (req, res) => {
  if (!req.files || !req.files.csv_file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded');
  }

  const requestId = await productCsvService.uploadCsv(req.files.csv_file);
  res.status(httpStatus.CREATED).send({ requestId });
});

const getStatus = catchAsync(async (req, res) => {
  const { requestId } = req.query;
  const status = await productCsvService.getStatus(requestId);
  if (!status) throw new ApiError(httpStatus.NOT_FOUND, 'Request not found');
  res.send({ status });
});

const downloadCsv = catchAsync(async (req, res) => {
  const { csvData, filename } = await productCsvService.downloadCsv(req.query.requestId);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.send(csvData);
});

const updateOutputUrlsWebhook = catchAsync(async (req, res) => {
  try {
    const { requestId, serialNumber, outputUrls } = req.body;
    logger.info(`Received webhook for requestId: ${requestId}, serialNumber: ${serialNumber}, outputUrls: ${outputUrls}`);
    await productCsvService.updateOutputUrls(requestId, serialNumber, outputUrls);
    res.status(httpStatus.OK).send();
  }
  catch (error) {
    logger.error(`Failed to process webhook: ${error}`);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send();
  }
});

module.exports = {
  uploadCsv,
  getStatus,
  updateOutputUrlsWebhook,
  downloadCsv,
};
