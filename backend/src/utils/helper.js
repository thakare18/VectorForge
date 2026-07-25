const { randomUUID } = require("crypto");

const generateId = () => {
    return randomUUID();
};

const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

const isNumber = (value) => {
    return typeof value === "number" && !Number.isNaN(value);
};

module.exports = {
    generateId,
    sleep,
    isNumber
};