var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'iStudy' });
});
router.get('/signup', function(req, res, next) {
  res.render('signup', { title: 'signup' });
});

router.get('/forgotpassword', function(req, res, next) {
  res.render('ForgotPassword', { title: 'forgotpassword' });
});

router.get('/signin', function(req, res, next) {
  res.render('signin', { title: 'signin' });
});


module.exports = router;
