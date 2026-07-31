const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {

    definition: {

        openapi: "3.0.0",

        info: {

            title: "VectorForge API",

            version: "1.0.0",

            description:
                "Vector Database built using Brute Force, KD-Tree and HNSW"

        },

        servers: [

            {

                url: "http://localhost:3000"

            }

        ]

        ,

        components: {

    schemas: {

        Vector: {

            type: "object",

            properties: {

                id: {

                    type: "string",

                    example: "vector-1"

                },

                values: {

                    type: "array",

                    items: {

                        type: "number"

                    },

                    example: [

                        0.12,
                        0.23,
                        0.34

                    ]

                },

                metadata: {

                    type: "object",

                    example: {

                        category: "AI"

                    }

                }

            }

        }

    }

},

        

    },

    apis: [

        "./src/routes/*.js"

    ]

};

const swaggerSpec =
    swaggerJsdoc(options);

module.exports = {

    swaggerUi,

    swaggerSpec

};