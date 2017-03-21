let router = [];

router['/'] = 'api.index';  // upload.index , admin/upload.index,  module/controller.action.query
router['/client'] = 'api.client';
router['/upload'] = 'api.upload';

//router['/upload/(:num)'] = 'upload.index.id=$1';

//$route['product/(:any)'] = 'def/product/detail/id=$1';
//$route['([a-z]+)/(\w+)'] = 'def/$1/$2';
//$route['(201\d)/([\w\d-_]*)/([\w\d-_]*)'] = 'y_$1/$2/$3';
//$route['login/(.+)'] = 'auth/login/login/$1';

module.exports = router; 
