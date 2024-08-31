const axios = require('axios');
const httpStatus = require('http-status');
const { Parser } = require('json2csv');
const { Product } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const config = require('../config/config');

// call the image service to process the images
const processImages = async (requestId, serialNumber, imageUrls) => {
  const response = await axios.post(`${config.imageServiceUrl}/v1/images/process`, {
    imageUrls,
    requestId,
    serialNumber,
  });
  return response.data;
};

const saveProducts = async (products) => {
  await Product.insertMany(products);
};

const processProducts = async (requestId) => {
  const products = await Product.find({ requestId });

  logger.info(`Processing ${products.length} products`);
  // call async and wait for webhook
  products.forEach(async (product) => {
    // call the image service to process the images
    processImages(requestId, product.serialNumber, product.inputUrls);
  });
};

const generateCsv = async (requestId) => {
  const products = await Product.find({ requestId });
  if (!products || products.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No products found for this request');
  }

  const fields = ['S. No.', 'Product Name', 'Input Image Urls', 'Output Image Urls'];
  const data = products.map((product) => ({
    'S. No.': product.serialNumber,
    'Product Name': product.name,
    'Input Image Urls': product.inputUrls.join(', '),
    'Output Image Urls': product.outputUrls.join(', '),
  }));

  const parser = new Parser({ fields, delimiter: '|' });
  const csvData = parser.parse(data);

  return {
    csvData,
    filename: `processed_product_images_${requestId}.csv`,
  };
};

// webhook function
const updateOutputUrls = async (requestId, serialNumber, outputUrls) => {
  return Product.findOneAndUpdate({ requestId, serialNumber }, { outputUrls, status: 'completed' }, { new: true });
};

module.exports = {
  saveProducts,
  processProducts,
  updateOutputUrls,
  generateCsv,
};
