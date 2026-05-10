from flask import Flask, render_template, request, jsonify, session, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import json, os, uuid, requests
from datetime import datetime

class Config:
    SECRET_KEY = 'zenilpro_2024'
    ADMIN_PASSWORD = 'zeniladmin2024'
    ADMIN_IDS = [6769229781]
    BOT_TOKEN = '8716353787:AAGAddW33W3jbOa0CVZVxez1MqqHL-bvCf0'
    SHOP_NAME = 'ZenilPro'
    PRODUCTS_FILE = 'products.json'
    ORDERS_FILE = 'orders.json'
    USERS_FILE = 'users.json'
    DELIVERY_FREE = 500000
    DELIVERY_COST = 30000
    UPLOAD_FOLDER = 'static/uploads'
    
    @classmethod
    def is_admin(cls, tid):
        return tid in cls.ADMIN_IDS if tid else False

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY
app.config['UPLOAD_FOLDER'] = Config.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
CORS(app)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

DEFAULT_PRODUCTS = [
    {"id":"1","name":"Chanel No. 5","description":"Legendary ayollar parfyumeriyasi. 100ml","price":1500000,"old_price":1800000,"image":"https://images.unsplash.com/photo-1541643600914-78b084683601?w=400","category":"parfum","in_stock":15,"discount":17,"sold_this_week":45},
    {"id":"2","name":"Dior Sauvage","description":"Erkaklar uchun klassik atir. 60ml","price":1200000,"old_price":1400000,"image":"https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400","category":"parfum","in_stock":20,"discount":14,"sold_this_week":32},
    {"id":"3","name":"Versace Crystal","description":"Ayollar uchun yangi atir. 90ml","price":980000,"old_price":1100000,"image":"https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=400","category":"parfum","in_stock":10,"discount":11,"sold_this_week":28},
    {"id":"4","name":"Calvin Klein One","description":"Uniseks atir. 200ml","price":850000,"old_price":950000,"image":"https://images.unsplash.com/photo-1594035910387-fba47791b1cd?w=400","category":"parfum","in_stock":25,"discount":10,"sold_this_week":50},
    {"id":"5","name":"Idish To'plami","description":"12 dona keramik idish","price":650000,"old_price":800000,"image":"https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400","category":"dishes","in_stock":30,"discount":19,"sold_this_week":15},
    {"id":"6","name":"Ariel 5kg","description":"Kir yuvish kukuni","price":85000,"old_price":100000,"image":"https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400","category":"powders","in_stock":100,"discount":15,"sold_this_week":200}
]

def load_json(f, d=None):
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as fl: return json.load(fl)
    return d if d is not None else []

def save_json(f, data):
    with open(f, 'w', encoding='utf-8') as fl: json.dump(data, fl, ensure_ascii=False, indent=2)

def load_products():
    p = load_json(Config.PRODUCTS_FILE)
    if not p: save_json(Config.PRODUCTS_FILE, DEFAULT_PRODUCTS); return DEFAULT_PRODUCTS
    return p

def save_products(p): save_json(Config.PRODUCTS_FILE, p)
def load_orders(): return load_json(Config.ORDERS_FILE, [])
def save_orders(o): save_json(Config.ORDERS_FILE, o)
def load_users(): return load_json(Config.USERS_FILE, {})
def save_users(u): save_json(Config.USERS_FILE, u)

def send_telegram(chat_id, text, reply_markup=None):
    url = f"https://api.telegram.org/bot{Config.BOT_TOKEN}/sendMessage"
    payload = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
    if reply_markup: payload['reply_markup'] = json.dumps(reply_markup)
    try: return requests.post(url, json=payload, timeout=10).json()
    except: return None

# ==================== WEBHOOK ====================
@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        data = request.json
        if 'message' in data:
            msg = data['message']
            chat_id = msg['chat']['id']
            text = msg.get('text', '')
            user = msg.get('from', {})
            first_name = user.get('first_name', 'Foydalanuvchi')
            
            if text == '/start':
                webapp_url = request.host_url.rstrip('/')
                welcome = f"""🎉 <b>Assalomu alaykum, {first_name}!</b>

🔥 <b>{Config.SHOP_NAME}</b> - Premium Parfyumeriya Do'koni

🛍 Pastdagi tugmani bosib do'konga kiring!"""
                
                reply_markup = {
                    'inline_keyboard': [[{
                        'text': '🛍 Do\'konga kirish',
                        'web_app': {'url': webapp_url}
                    }], [{
                        'text': 'ℹ️ Yordam', 'callback_data': 'help'
                    }]]
                }
                send_telegram(chat_id, welcome, reply_markup)
                
                menu_markup = {
                    'keyboard': [
                        [{'text': '🛍 Katalog'}, {'text': '🛒 Savat'}],
                        [{'text': '❤️ Sevimlilar'}, {'text': '👤 Profil'}]
                    ],
                    'resize_keyboard': True
                }
                send_telegram(chat_id, "Tez menyu:", menu_markup)
            
            elif text == '/menu' or text == '🛍 Katalog':
                webapp_url = request.host_url.rstrip('/')
                reply_markup = {'inline_keyboard': [[{'text': '🛍 Do\'konga kirish', 'web_app': {'url': webapp_url}}]]}
                send_telegram(chat_id, "Do'konga kirish:", reply_markup)
            
            elif text == '/help':
                send_telegram(chat_id, "📚 Yordam: /start - Botni ishga tushirish, /menu - Katalog")
            
            elif text == '/admin':
                if Config.is_admin(user.get('id')):
                    send_telegram(chat_id, f"🔐 Admin: {request.host_url.rstrip('/')}/admin\nParol: {Config.ADMIN_PASSWORD}")
                else:
                    send_telegram(chat_id, "❌ Siz admin emassiz!")
        
        return jsonify({'ok': True})
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'ok': False})

# ==================== WEB ROUTES ====================
@app.route('/')
def index(): return render_template('index.html')

@app.route('/admin')
def admin(): return render_template('admin.html')

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)

@app.route('/api/check-admin')
def check_admin():
    uid = request.args.get('user_id', type=int)
    return jsonify({'is_admin': Config.is_admin(uid)})

@app.route('/api/products')
def get_products():
    p = load_products()
    cat = request.args.get('category', 'all')
    if cat and cat != 'all': p = [i for i in p if i.get('category') == cat]
    return jsonify({'success': True, 'products': p})

@app.route('/api/orders', methods=['GET', 'POST'])
def handle_orders():
    if request.method == 'POST':
        d = request.json
        p = load_products()
        sub = d.get('subtotal', 0) or sum(i.get('price',0)*i.get('quantity',1) for i in d.get('items',[]))
        dlv = 0 if sub >= Config.DELIVERY_FREE else Config.DELIVERY_COST
        order = {
            'order_id': str(uuid.uuid4())[:8].upper(),
            'user_id': d.get('user_id'),
            'customer_name': d.get('name','Mijoz'),
            'phone': d.get('phone',''),
            'address': d.get('address',''),
            'items': d.get('items',[]),
            'subtotal': sub, 'delivery': dlv, 'total': sub + dlv,
            'status': 'pending', 'status_text': 'Tayyorlanmoqda',
            'created_at': datetime.now().isoformat(),
            'payment_method': d.get('payment_method','cash')
        }
        for item in order['items']:
            prod = next((x for x in p if x['id'] == item['id']), None)
            if prod:
                prod['in_stock'] = max(0, prod['in_stock'] - item.get('quantity',1))
                prod['sold_this_week'] = prod.get('sold_this_week',0) + item.get('quantity',1)
        save_products(p)
        orders = load_orders(); orders.append(order); save_orders(orders)
        for aid in Config.ADMIN_IDS:
            send_telegram(aid, f"🛍 Yangi buyurtma #{order['order_id']}\n👤 {order['customer_name']}\n📱 {order['phone']}\n💰 {order['total']:,} so'm")
        return jsonify({'success': True, 'order': order})
    else:
        uid = request.args.get('user_id', type=int)
        orders = load_orders()
        if uid: orders = [o for o in orders if o.get('user_id') == uid]
        return jsonify({'success': True, 'orders': orders[::-1]})

@app.route('/api/user', methods=['POST'])
def manage_user():
    d = request.json
    uid = str(d.get('user_id',''))
    users = load_users()
    if uid in users: users[uid].update(d)
    else: users[uid] = {'user_id':uid, 'username':d.get('username',''), 'first_name':d.get('first_name',''), 'phone':d.get('phone',''), 'created_at':datetime.now().isoformat()}
    save_users(users)
    return jsonify({'success': True})

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    d = request.json
    if d.get('telegram_id') and Config.is_admin(d['telegram_id']):
        session['admin'] = True; return jsonify({'success': True})
    if d.get('password') == Config.ADMIN_PASSWORD:
        session['admin'] = True; return jsonify({'success': True})
    return jsonify({'success': False})

@app.route('/api/admin/check', methods=['GET'])
def admin_check():
    return jsonify({'is_admin': session.get('admin', False)})

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.clear(); return jsonify({'success': True})

@app.route('/api/admin/upload', methods=['POST'])
def admin_upload():
    if not session.get('admin'): return jsonify({'success': False}), 401
    if 'file' not in request.files: return jsonify({'success': False, 'message': 'Fayl yo\'q'})
    file = request.files['file']
    if file.filename == '': return jsonify({'success': False})
    if file and allowed_file(file.filename):
        filename = str(uuid.uuid4())[:8] + '_' + secure_filename(file.filename)
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        file.save(os.path.join(Config.UPLOAD_FOLDER, filename))
        url = f"/static/uploads/{filename}"
        return jsonify({'success': True, 'url': url})
    return jsonify({'success': False, 'message': 'Noto\'g\'ri format'})

@app.route('/api/admin/products', methods=['POST', 'DELETE'])
def admin_products():
    if not session.get('admin'): return jsonify({'success': False}), 401
    p = load_products()
    if request.method == 'POST':
        d = request.json
        new = {'id':str(uuid.uuid4())[:8], 'name':d.get('name',''), 'description':d.get('description',''), 'price':int(d.get('price',0)), 'old_price':int(d.get('old_price',d.get('price',0))), 'image':d.get('image','https://placehold.co/400'), 'category':d.get('category','parfum'), 'in_stock':int(d.get('in_stock',10)), 'discount':int(d.get('discount',0)), 'sold_this_week':0}
        p.append(new); save_products(p); return jsonify({'success': True, 'product': new})
    elif request.method == 'DELETE':
        pid = request.json.get('id')
        p = [x for x in p if x['id'] != pid]; save_products(p); return jsonify({'success': True})

if __name__ == '__main__':
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static/css', exist_ok=True)
    os.makedirs('static/js', exist_ok=True)
    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    port = int(os.environ.get('PORT', 5000))
    print(f"ZenilPro running on port {port}")
    app.run(debug=False, host='0.0.0.0', port=port)
