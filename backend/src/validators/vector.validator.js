const Joi = require("joi");

const insertVectorSchema = Joi.object({

    id: Joi.string()
        .required(),

    values: Joi.array()
        .items(Joi.number())
        .min(1)
        .max(4096)
        .required(),

    embeddingModel: Joi.string().max(100).allow(null).optional(),
    metadata: Joi.object()
        .optional()

});

module.exports = {

    insertVectorSchema

};