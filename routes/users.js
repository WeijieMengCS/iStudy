'use strict';

var express = require('express');
var router = express.Router();
var db = require(__dirname + '/../db.js');
var _ = require('underscore');
var randomstring = require("randomstring");
var sendemail = require(__dirname + '/../helpers/mailer_helper.js').sendEmail;
var middleware = require(__dirname + '/../middleware.js')(db);
var Sequelize = require('sequelize');

/******************************************************
 *              Sign Up
 ******************************************************/
router.post('/', function(req, res, next) {
	/**
	 * JSON Format: {
	 * 		"userName": "...",
	 * 		"email": "...",
	 * 		"password": "..."
	 * }
	 */
    var body = _.pick(req.body, 'userName', 'email', 'password');

    db.user.create(body).then(function(user) {
        db.profile.create({
            user_id: user.id
        }).then(function(profile) {
			if (profile){
				res.status(200).json(user.toPublicJSON());
			}
			else {
				res.status(404).send({err: "Profile Creation Error"});
			}
        }, function(e) {
            res.status(400).send({err: e});
        });
    }, function(e) {
		//TODO: need to tell if it's invalid userName or email by frontend send request check if userName exists
        res.status(400).send({err: e});
    });
});

/******************************************************
 *            Reset Password Request
 ******************************************************/
router.post('/reset', function(req, res, next) {
    var query = req.query;
    var where = {};

    if (query.hasOwnProperty('email') && query.email.length > 0) {
        where.email = {
            $like: '%' + query.email + '%'
        };
    }
    db.user.findAll({
        where: where
    }).then(function(users) {
        var verificationcode = randomstring.generate(8);
        sendemail({
            'subject': 'iStudy Reset Your Password',
            'text': 'Hi, your verification code is ' + verificationcode
        }, query.email);
        users[0].update({
            'verificationcode': verificationcode
        }).then(function(user) {
            res.json(verificationcode);
        }, function(e) {
            res.status(400).send({err: e});
        });

    }, function(e) {
        res.status(500).send();
    });
});

/******************************************************
 *          Check Verification Code
 ******************************************************/
router.post('/checkcode', function(req, res) {
	/**
	 * JSON Format: {
	 * 		"email": "...",
	 * 		"verificationcode': "..."
	 * }
	 */
	var body = _.pick(req.body, 'email', 'verificationcode');
    db.user.findOne({
        where: {
            email: body.email
        },
        attributes: ['verificationcode']
    }).then(function(user) {
        if (body.verificationcode === user.getDataValue('verificationcode')) {
            res.status(200).send();

        } else {
            res.status(401).send({error: 'verification code invalid!'});
        }
    });
});

/******************************************************
 *              Set New Password
 ******************************************************/

router.put('/newpassword', function(req, res) {
	/**
	 * JSON Format: {
	 * 		"email": "..."
	 * 		"newpassword": "..."
	 * }
	 */
    var body = _.pick(req.body, 'email', 'newpassword');
    body.password = body.newpassword;

    var where = {};
    var attributes = {};
    db.user.authenticate(body).then(function(user) {
        //duplicate  passwordlog
        console.log('log in ');
        res.status(401).send();
    }, function() {
        console.log('fails ');
        if (body.hasOwnProperty('email')) {
            where.email = {
                $like: '%' + body.email + '%'
            };
        }
        if (body.hasOwnProperty('password')) {
            attributes.password = body.password;
        }
        db.user.findAll({
            where: where
        }).then(function(users) {
			if (users){
				users[0].update(
					attributes
				).then(function(user) {
					//new password set
					console.log('@@@@' + attributes.password);
					res.json(user.toPublicJSON());
				}, function(e) {
					res.status(400).json(e);
				});
				//users[0].setDataValue('password','66666');

			}
			else {
				//no such email in database
				res.status(404).send({err: "No Such User"});
			}

        }, function(e) {
            res.status(400).send({err: e});
        });

    });
});


/******************************************************
 *                      LogIN
 ******************************************************/
router.post('/login', function(req, res) {
	/**
	 * JSON Format: {
	 * 		"email": "...",
	 * 		"password": "..."
	 * }
	 */
    var body = _.pick(req.body, 'email', 'password');
    //console.log(JSON.stringify(body));

    db.user.authenticate(body).then(function(user) {
        var token = user.generateToken('authentication');
        console.log('token= ' + token);
        if (token) {
            res.header('Auth', token).json(user.toPublicJSON());
        } else {
            res.status(401).send();
        }

    }, function(e) {
        res.status(400).send({err: e});

    });
});


/******************************************************
 *           Get User's Friend List
 ******************************************************/
router.post('/get-friends', middleware.requireAuthentication,function (req, res) {
	/**
	 * JSON Format: {
	 * 		"userName": "..."
	 * }
	 */
	var body = _.pick(req.body, 'userName');
	db.user.findOne({where: {userName: body.userName}}).then(function(user){
		if (user){
			user.getFriends().then(function (friends) {
				res.status(200).json(friends);
			});
		}
		else {
			res.status(404).send({err: "User Not Found"});
		}
	});
});

/******************************************************
 *           Send Friend Request
 ******************************************************/
router.post('/send-friend-request', middleware.requireAuthentication,function (req, res) {
	/**
	 * JSON Format: {
	 * 		"senderName": "...",
	 * 		"receiverName": "..."
	 * }
	 */
	var body = _.pick(req.body, 'senderName', 'receiverName');
	db.user.findOne({where: {userName: body.senderName}}).then(function(sender){
		if (sender){
			db.user.findOne({where: {userName: body.receiverName}}).then(function (receiver) {
				if (receiver){
					if (receiver.id === sender.id){
						res.status(400).send({err: "One can not send friend invitation to oneself"});
					}
					else {
						db.friend_request.create({sender_id: sender.id, receiver_id: receiver.id});
						res.status(200).send({res: "Sent Friend Request Successfully"});
					}
				}
				else {
					res.status(404).send({err: "Receiver Not Exist"});
				}
			});
		}
		else {
			res.status(404).send({err: "Sender Not Exist"});
		}
	});
});

/******************************************************
 *           Get Friend Invitations
 ******************************************************/
// Notes: Collect All the requests a user has received
router.post('/get-friend-invitations', middleware.requireAuthentication,function (req, res){
	/**
	 * JSON Format: {
	 * 		"userName": "...",
	 * }
	 */
	var sender_ids = [];
	var body = _.pick(req.body, 'userName');
	db.user.findOne({where: {userName: body.userName}}).then(function (user) {
		if (user){
			db.friend_request.findAll({where: {receiver_id: user.id}}).then(function (invitations) {
				if (invitations){
					invitations.map(function (invitation) {
						// only get unhandled invitations
						if (invitation.status === 0){
							sender_ids.push(invitation.sender_id);
						}
					});

					db.user.findAll({
						where: { id: { $in: sender_ids}},
						attributes: ['userName']
					}).then(function (senders) {
						res.status(200).json(senders);
					});
				}
				else {
					res.status(404).send({err: "No invitations received"});
				}
			});
		}
		else {
			res.status(404).send({err: "No Such User"});
		}
	})
});

/******************************************************
 *           Get Friend Requests
 ******************************************************/
// Notes: Collect All the requests one has sent out
router.post('/get-friend-requests', middleware.requireAuthentication,function (req, res){
	/**
	 * JSON Format: {
	 * 		"userName": "...",
	 * }
	 */
	var request_list = {};
	var rs = [];
	var receiver_ids = [];
	var request_statuses = [];
	request_list.requests = rs;
	var body = _.pick(req.body, 'userName');
	db.user.findOne({where: {userName: body.userName}}).then(function (user) {
		if (user){
			db.friend_request.findAll({where: {sender_id: user.id}}).then(function (requests){
				if (requests){
					requests.map(function(request){
						receiver_ids.push(request.receiver_id);
						request_statuses.push(request.status);
					});

					db.user.findAll({
						where: { id: { $in: receiver_ids}},
						attributes: ['userName']
					}).then(function (receivers) {
						for (var i = 0; i < receivers.length; i++){
							rs.push({
								"receiver": receivers[i].userName,
								"status": request_statuses[i]
							});
						}
						res.status(200).json(request_list.requests);
					});
				}
				else {
					res.status(404).send({err: "No requests sent"});
				}
			});
		}
		else {
			res.status(404).send({err: "No Such User"});
		}
	});

});

/******************************************************
 *           Accept Or Decline Request
 ******************************************************/
router.post('/invitation-accept-or-not', middleware.requireAuthentication,function (req, res){
	/**
	 * JSON Format: {
	 * 		"sender": "...",
	 * 		"receiver": "..."
	 * 		"status_code": "..."
	 * }
	 */
	var attributes = {};
	var body = _.pick(req.body, 'sender', 'receiver', 'status_code');
	if (body.hasOwnProperty('status_code')){
		attributes.status = body.status_code;
	}
	db.user.findOne({where: {userName: body.receiver}}).then(function (receiver){
		if (receiver){
			db.user.findOne({where: {userName: body.sender}}).then(function (sender){
				if (sender){
					if (sender.id === receiver.id){
						res.status(400).send({err: "Not a valid request"});
					}
					else {
						db.friend_request.findOne({where: {sender_id: sender.id, receiver_id: receiver.id}})
							.then(function (request) {
								if (request){
									request.updateAttributes(attributes).then(function (request) {
										if (request){
											if (attributes.status === 1 || attributes.status === 0){
												// add request sender as friend of request receiver
												if (attributes.status === 1){
													addFriend(sender.id, receiver.id, res)
														.then(function () {
															res.status(200).json(request);
														});
												}
											}
										}
										else {
											res.status(400).send({err: "Fail to update the friend_request"});
										}
									}, function (e) {
										res.status(400).send({err: e});
									})
								}
								else {
									res.status(404).send({err: "Request does not exist"});
								}
							});
					}
				}
				else {
					res.status(404).send({err: "Sender does not exist"});
				}
			});
		}
		else {
			res.status(404).send({err: "Sender does not exist"});
		}
	});
});


/******************************************************
 *           		Find Friends
 ******************************************************/
// find friends in same class by country, hobby, language
router.post('/find-friends', middleware.requireAuthentication,function (req, res){
	/**
	 * JSON Format: {
	 * 		"userName": "...",
	 * 		"course": "...",
	 * 		"professor": "...",
	 * 		"preference" : {
	 * 			"nationality": "...",
	 * 			"hobby": "...",
	 * 			"language": "..."
	 * 		}
	 *
	 * }
	 */
	var body = _.pick(req.body, 'userName','course', 'professor', 'preference');
	var preference = body.preference;
	var filter = {};
	var otherStudent_Ids = [];

	if (preference.hasOwnProperty('nationality')) {
		filter.nationality = preference.nationality;
	}
	if (preference.hasOwnProperty('hobby')){
		filter.hobby = preference.hobby;
	}
	if (preference.hasOwnProperty('language')){
		filter.language = preference.language;
	}

	db.course.findOne({where: {name: body.course}}).then(function (course) {
		if (course){
			db.professor.findOne({where: {name: body.professor}}).then(function (professor){
				if (professor){
					// get students from course
					db.course_professor.findOne({where: {course_id: course.id, professor_id: professor.id}})
						.then(function(c_u){
							c_u.getStudents().then(function(students){
								if (students){
									// exclude user himself
									findAndRemove(students, "userName", body.userName);
									students.map(function (student) {
										otherStudent_Ids.push(student.id);
									});

									db.user.findAll({where: {id: {$in: otherStudent_Ids}}})
										.then(function (users) {
											if (users){
												filterByPreference(otherStudent_Ids, preference, res);
											}
										});
									//res.send(students);
								}
								else {
									res.status(404).send({err: "No stduents joined this course"});
								}
							});
						});
				}
				else {
					res.status(404).send({err: "Professor Not Found"});
				}
			})
		}
		else {
			res.status(404).send({err: "Course Not Found"});
		}
	});


});


/**
 * Remove one element from array
 * @param array
 * @param property
 * @param value
 */
var findAndRemove = function (array, property, value) {
	array.forEach(function (result, index) {
		if (result[property] === value){
			// remove from array
			array.splice(index, 1);
		}
	});
};


/**
 * filter data by preference
 * @param student_ids
 * @param preference
 * @param res
 * @returns {Promise}
 */
var filterByPreference = function (student_ids, preference, res) {
	return new Promise(function (resolve, reject) {
		var byNation = false;
		var byHobby = false;
		var byLanguage = false;
		if (preference.nationality !== ""){
			byNation = true;
		}
		if (preference.hobby !== ""){
			byHobby = true;
		}
		if (preference.language !== ""){
			byLanguage = true;
		}
		var possible_friends = [];
		if (byNation === true && byHobby === true && byLanguage === true){
			// ALL required
			filterByNHL(res, student_ids, preference, possible_friends);
		}
		else if(byNation === true && byHobby === true){
			filterByNationAndHobby(res, student_ids, preference, possible_friends);
		}
		else if(byNation === true && byLanguage === true){
			filterByNationAndLanguage(res, student_ids, preference, possible_friends);
		}
		else if (byHobby === true && byLanguage === true){
			filterByHobbyAndLanguage(res, student_ids, preference, possible_friends);
		}
		else if (byNation === true){
			// ONLY by NATION
			filterByNation(res, student_ids, preference, possible_friends);
		}
		else if (byHobby === true){
			// ONLY by HOBBY
			filterByHobby(res, student_ids, preference, possible_friends);
		}
		else {
			//ONLY by LANGUAGE
			filterByLanguage(res, student_ids, preference, possible_friends);
		}

	});
};

/**
 * Find Friends from same country and with same hobby and language speaking
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByNHL = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	var profileByNHL = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// get all the profiles first
						db.profile.findAll({
							where: {
								id: {$in: profile_ids},
								nationality: preference.nationality
							}
						})
							.then(function (profiles) {
								if (profiles) {
									// filter by language
									getProfileByHL(profiles, preference, profileByNHL)
										.then(function () {
											getUsers(profileByNHL, possible_friends)
												.then(function () {
													res.status(200).send(possible_friends);
												});
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject from same country and with same hobby found"});
			}
		});
};

/**
 * Find Friends from same nation and with same hobby
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByNationAndHobby = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	var profileByNH = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// get all the profiles first
						db.profile.findAll({
							where: {
								id: {$in: profile_ids},
								nationality: preference.nationality
							}
						})
							.then(function (profiles) {
								if (profiles) {
									// filter by language
									getProfileByHobby(profiles, preference.hobby, profileByNH)
										.then(function () {
											getUsers(profileByNH, possible_friends)
												.then(function () {
													res.status(200).send(possible_friends);
												});
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject from same country and with same hobby found"});
			}
		});
};

/**
 * Find friends from same country and speak same lanuage
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByNationAndLanguage = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	var profileByNL = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// get all the profiles first
						db.profile.findAll({
							where: {
								id: {$in: profile_ids},
								nationality: preference.nationality
							}
						})
							.then(function (profiles) {
								if (profiles) {
									// filter by language
									getProfileByLanguage(profiles, preference.language, profileByNL)
										.then(function () {
											getUsers(profileByNL, possible_friends)
												.then(function () {
													res.status(200).send(possible_friends);
												});
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject from same country and same language speaking found"});
			}
		});
};

/**
 * Finds Friends with same hobby and language speaking
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByHobbyAndLanguage = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	var profileByHL = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// get all the profiles first
						db.profile.findAll({
							where: {
								id: {$in: profile_ids}
							}
						})
							.then(function (profiles) {
								if (profiles) {
									// filter by language and hobby
									getProfileByHL(profiles, preference, profileByHL)
										.then(function () {
											getUsers(profileByHL, possible_friends)
												.then(function () {
													res.status(200).send(possible_friends);
												});
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject with same hobby and same language speaking found"});
			}
		});
};

/**
 * Find Friends by languages
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByLanguage = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	var profileByLanguage = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// get all the profiles first
						db.profile.findAll({
							where: {
								id: {$in: profile_ids}
							}
						})
							.then(function (profiles) {
								if (profiles) {
									// filter by language
									getProfileByLanguage(profiles, preference.language, profileByLanguage)
										.then(function () {
											getUsers(profileByLanguage, possible_friends)
												.then(function () {
													res.status(200).send(possible_friends);
												});
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject with same language speaking found"});
			}
		});
};

/**
 * Find Friends with same hobby
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByHobby = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	var profileByHobby = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// get all the profiles first
						db.profile.findAll({
							where: {
								id: {$in: profile_ids}
							}
						})
							.then(function (profiles) {
								if (profiles) {
									// filter by hobby
									getProfileByHobby(profiles, preference.hobby, profileByHobby)
										.then(function () {
											getUsers(profileByHobby, possible_friends)
												.then(function () {
													res.status(200).send(possible_friends);
												});
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject with same hobby found"});
			}
		});
};

/**
 * Find friends by nationality
 * @param res
 * @param student_ids
 * @param preference
 * @param possible_friends
 */
var filterByNation = function (res, student_ids, preference, possible_friends) {
	var profile_ids = [];
	db.user.findAll({where: {id: {$in : student_ids}}})
		.then(function (students) {
			if (students) {
				// get all the corresponding profile ids
				getProfileIds(students, profile_ids)
					.then(function () {
						// filter by nation in profile
						db.profile.findAll({
							where: {
								id: {$in: profile_ids},
								nationality: preference.nationality
							}
						})
							.then(function (profiles) {
								if (profiles) {
									getUsers(profiles, possible_friends)
										.then(function () {
											res.status(200).send(possible_friends);
										});
								}
							});
					});
			}
			else {
				res.status(404).send({res: "No Subject from same country found"});
			}
		});
};


/**
 * Get profiles with same hobby and same language speaking
 * @param profiles
 * @param preference
 * @param profileByHL
 * @returns {Promise}
 */
var getProfileByHL = function (profiles, preference, profileByHL) {
	return new Promise(function (resolve, reject) {
		var count = 0;
		var len = profiles.length;
		var sameLanguage = false;
		var sameHobby = false;
		var cmpL = false;
		var cmpH = false;
		profiles.map(function (profile) {
			profile.getLanguages().then(function (languages) {
				if (languages){
					profile.getHobbies().then(function (hobbies) {
						if (hobbies){
							// reset flags
							sameHobby = false;
							sameLanguage = false;
							cmpL = false;
							cmpH = false;
							count++;
							languages.map(function (language) {
								if (language.name === preference.language){
									sameLanguage = true;
								}
								cmpL = true;
								resolve();
							});
							hobbies.map(function (hobby) {
								if (hobby.name === preference.hobby){
									sameHobby = true;
								}
								cmpH = true;
								resolve();
							});
							if (sameHobby === true && sameLanguage === true){
								profileByHL.push(profile);
							}
						}
						if (cmpH === true && cmpL === true){
							resolve();
						}
					});
				}
				if (cmpH === true && cmpL === true){
					resolve();
				}
			});
		});
		if (count === len){
			resolve();
		}
	});
};

/**
 * Get Profiles with same language speaking
 * @param profiles
 * @param language
 * @param profileByLanguage
 * @returns {Promise}
 */
var getProfileByLanguage = function (profiles, language, profileByLanguage) {
	return new Promise(function (resolve, reject) {
		var count = 0;
		var len = profiles.length;
		profiles.map(function (profile) {
			profile.getLanguages().then(function (languages) {
				if (languages){
					count++;
					languages.map(function (l) {
						if (l.name === language){
							// find a matched one
							profileByLanguage.push(profile);
						}
						resolve();
					});
					resolve();
				}
			});
		});
		if (count === len){
			resolve();
		}
	});
};

/**
 * Get Profile Ids with same Hobby
 * @param profiles
 * @param hobby
 * @param profileByHobby
 * @returns {Promise}
 */
var getProfileByHobby = function (profiles, hobby, profileByHobby) {
	return new Promise(function (resolve, reject) {
		var count = 0;
		var len = profiles.length;
		profiles.map(function (profile) {
			profile.getHobbies().then(function (hobbies) {
				if (hobbies){
					count++;
					hobbies.map(function (h) {
						if (h.name === hobby){
							// find a matched one
							profileByHobby.push(profile);
						}
						resolve();
					});
					resolve();
				}
			});
		});
		if (count === len){
			resolve();
		}
	});
};


/**
 * Get matched profile ids
 * @param students
 * @param profile_ids
 * @returns {Promise}
 */
var getProfileIds = function (students, profile_ids) {
	return new Promise(function (resolve, reject) {
		var count = 0;
		var len = students.length;
		students.map(function (student) {
			student.getProfile().then(function (profile) {
				if (profile){
					count++;
					profile_ids.push(profile.id);
					resolve();
				}

			})
		});
		if (count === len){
			resolve();
		}
	});
};

/**
 * Return corresponding user names by their p_ids
 * @param profiles
 * @param possibleFriends
 */
var getUsers = function (profiles, possibleFriends) {
	return new Promise(function (resolve, reject) {
		var count = 0;
		var len = profiles.length;
		profiles.map(function (profile) {
			profile.getUser().then(function (user) {
				if (user){
					count++;
					possibleFriends.push(user);
					resolve();
				}
			})
		});
		if (count === len){
			resolve();
		}
	});
};

/**
 * Add friendship of sender and receiver to db
 * Rerturn a promise
 * @param sender_id
 * @param receiver_id
 * @param res to send back info to frontend
 */
var addFriend = function (sender_id, receiver_id, res) {
	return new Promise(function (resolve, reject) {
		db.user.findById(sender_id).then(function (sender) {
			if (sender){
				db.user.findById(receiver_id).then(function (receiver) {
					if (receiver){
						receiver.addFriend(sender).then(function (success) {
							if (success){
								sender.addFriend(receiver).then(function (success) {
									if (success){
										resolve();
									}
								});
							}
						});
					}
					else {
						res.status(404).send({err: "Receiver Not Found"});
					}
				})
			}
			else {
				res.status(404).send({err: "Sender Not Found"});
			}
		});
	});
};

module.exports = router;
