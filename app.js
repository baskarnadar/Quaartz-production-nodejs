//app.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
var path = require('path');
var cors = require('cors');
var bodyParser = require('body-parser');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var itemRoute = require('./controllers/item/item.route');
var storeRoute = require('./controllers/store/store.route');
var UserRoute = require('./controllers/user/user.route');
var upload = require('./controllers/upload/upload.route');
var productRoute = require('./controllers/product/product.route');
var HomeRoute = require('./controllers/home/home.route');
var CommonRoute = require('./controllers/common/common.route');
var CartRoute = require('./controllers/cart/cart.route');
var AccountRoute = require('./controllers/account/account.route');
var CheckoutRoute = require('./controllers/checkout/checkout.route');
var OrderRoute = require('./controllers/order/order.route');
var PrdColor = require('./controllers/prdcolor/prdcolor.route');
var PrdSize = require('./controllers/prdsize/prdsize.route');
var Page = require('./controllers/page/page.route');

var PainterRoute = require('./controllers/painter/painter.route');
var CategoryRoute = require('./controllers/category/category.route');
var DashBoardRoute = require('./controllers/dashboard/dashboard.route');
var OfferRoute = require('./controllers/offer/offer.route');
var CityRoute = require('./controllers/lookupdata/city/city.route');
var OrderStatusRoute = require('./controllers/orderstatus/orderstatus.route');
var BannerRoute = require('./controllers/banner/banner.route');
var MainMenuRoute = require('./controllers/admin/mainmenu/mainmenu.route');
var SubMenuRoute = require('./controllers/admin/submenu/submenu.route');

/* ✅ NEW: SETTINGS ROUTE */
var SettingRoute = require('./controllers/setting/setting.route');

/* ✅ NEW: LOOKUPDATA PRODUCT COLOR ROUTES */
var MainPrdColorRoute = require('./controllers/lookupdata/productcolor/main/mainprdcolor.route');
var SubPrdColorRoute = require('./controllers/lookupdata/productcolor/sub/subprdcolor.route');

//app
var AppPrdColor = require('./controllers/app/prdcolor/prdcolor.route');

var logger = require('morgan');
const { connectToMongoDB } = require('./database/mongodb');

const app = express();

// -------------------- Middleware --------------------
app.use(express.json());
app.use(logger('dev'));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({
  limit: "50mb",
  extended: true,
  parameterLimit: 30000
}));

// -------------------- Routes --------------------
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/item', itemRoute);
app.use('/api/store', storeRoute);
app.use('/api/product/upload/', upload);
app.use('/api/product', productRoute);
app.use('/api/home', HomeRoute);
app.use('/api/common', CommonRoute);
app.use('/api/cart', CartRoute);
app.use('/api/account', AccountRoute);
app.use('/api/checkout', CheckoutRoute);
app.use('/api/order', OrderRoute);
app.use('/api/prdcolor', PrdColor);
app.use('/api/prdsize', PrdSize);
app.use('/api/page', Page);
app.use('/api/user', UserRoute);
app.use('/api/painter', PainterRoute);
app.use('/api/category', CategoryRoute);
app.use('/api/dashboard', DashBoardRoute);
app.use('/api/offer', OfferRoute);
app.use('/api/orderstatus', OrderStatusRoute);
app.use('/api/banner', BannerRoute);
app.use('/api/mainmenu', MainMenuRoute);
app.use('/api/submenu', SubMenuRoute);
app.use('/api/lookupdata/city', CityRoute);
app.use('/api/app/prdcolor', AppPrdColor);

/* ✅ LOOKUPDATA: PRODUCT COLOR */
app.use('/api/lookupdata/productcolor/main', MainPrdColorRoute);
app.use('/api/lookupdata/productcolor/sub', SubPrdColorRoute);

/* ✅ SETTINGS API */
app.use('/api/setting', SettingRoute);

// -------------------- MongoDB --------------------
connectToMongoDB()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection failed', err));

// -------------------- Health Check --------------------
app.get('/testconn', (req, res) => {
  res.send('Ok running to the API with the latest changes for you ===y===');
});

// ❌ REMOVED app.listen() (handled by bin/www)

module.exports = app;