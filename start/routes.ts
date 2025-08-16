import router from '@adonisjs/core/services/router'
import HelloController from '../app/controllers/hello_controller.js'
import InterrogationUnit from '../app/controllers/interrogationUnit.js'

/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

router.on('/').render('hello')
router.get('/hello', [HelloController, 'show'])
router.get('/interrogation', [InterrogationUnit, 'show'])
router.get('/api/interrogate', [InterrogationUnit, 'api'])
router.post('/api/interrogate', [InterrogationUnit, 'api'])
