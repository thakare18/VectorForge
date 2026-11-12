const validate = (schema) => {

    return (req, res, next) => {

        //console.log(req.body);

        const { error } =
            schema.validate(req.body, { convert: false });

        if (error) {

            return res.status(400).json({

                success: false,

                message:
                    error.details[0].message

            });

        }

        next();

    };

};


module.exports = validate;