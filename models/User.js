var bcrypt = require('bcrypt');
var cryptjs = require('crypto-js');
var jwt = require('jsonwebtoken');
var _ = require('underscore');

module.exports = function(connection, DataTypes) {
    var User = connection.define('user', {
        email: {
            type: DataTypes.STRING,
            allowNull: false, //not optional
            unique: true, //avoid duplicate
            validate: {
                //  notEmpty: true,//can't be empty string
                isEmail: true
            }
        },
        salt: {
            //append random words to password
            type: DataTypes.STRING

        },
        password_hash: {
            type: DataTypes.STRING

        },
        password: {
            type: DataTypes.VIRTUAL,
            allowNull: false,
            validate: {
                //  notEmpty: true,//can't be empty string
                len: [7, 100]
            },
            //validate reg expression
            set: function(value) {
                var saltRounds = 10;
                var salt = bcrypt.genSaltSync(saltRounds);
                var hashedPassword = bcrypt.hashSync(value, salt);
                this.setDataValue('password', value);
                this.setDataValue('salt', salt);
                this.setDataValue('password_hash', hashedPassword);
            }
        }

    }, {
        hooks: {
            beforeValidate: function(user, options) {
                if (typeof user.email === 'string') {
                    //normalize data before we validate it
                    // izzy: why normalize?
                    user.email = user.email.toLowerCase();
                }

            }
        },
        classMethods: {
            authenticate: function(body) {

                return new Promise(function(resolve, reject) {

                    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
                        return reject();
                    }
                    console.log(body);

                    user.findOne({
                            where: {
                                email: body.email
                            }
                        }

                    ).then(function(user) {
                        if (!user || !bcrypt.compareSync(body.password, user.get('password_hash'))) {
                            return reject();
                        }
                        return resolve(user);

                    }, function(e) {
                        return reject();
                    });
                });
            },
            findByToken: function(token) {

                return new Promise(function(resolve, reject) {
                    //decode code
                    //decode data
                    try {
                        var decodedJWT = jwt.verify(token, 'qweasdzxc');
                        var bytes = cryptjs.AES.decrypt(decodedJWT.token, 'abc123!@#!');
                        var tokenData = JSON.parse(bytes.toString(cryptjs.enc.Utf8));

                        user.findById(tokenData.id).then(function(user) {
                            if (user) {
                                resolve(user);
                            } else {
                                reject();
                            }
                        }, function(e) {
                            reject();
                        });
                    } catch (e) {
                        return reject();
                    } finally {

                    }
                });
            }

        },
        instanceMethods: {
            toPublicJSON: function() {
                var json = this.toJSON();
                return _.pick(json, 'id', 'email', 'createAt', 'updateAt');
            },
            //type of token to generate
            generateToken: function(type) {
                if (!_.isString(type)) {
                    return undefined;
                }
                try {
                    var stringData = JSON.stringify({
                        id: this.get('id'),
                        type: type
                    });
                    var encrypedData = cryptjs.AES.encrypt(stringData, 'abc123!@#!').toString();
                    var token = jwt.sign({
                        token: encrypedData
                    }, 'qweasdzxc');
                    return token;
                } catch (e) {
                    return undefined;
                }
            }


        }

    });
    return User;
};