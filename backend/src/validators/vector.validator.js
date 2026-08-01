const Joi = require("joi");

const insertVectorSchema = Joi.object({

    id: Joi.string()
        .required(),

    values: Joi.array()
        .items(Joi.number())
        .min(1)
        .required(),

    metadata: Joi.object()
        .optional()

});

module.exports = {

    insertVectorSchema

};