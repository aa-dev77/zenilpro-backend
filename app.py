from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import json, os, uuid, requests
from datetime import datetime

class Config:
    SECRET_KEY = 'zenilpro_2024'
    ADMIN_PASSWORD = 'zeniladmin2024'
    ADMIN_IDS = [6769229781]  # Sizning ID
    BOT_TOKEN = '8716353787:AAGAddW33W3jbOa0CVZVxez1MqqHL-bvCf0'  # YANGI TOKEN OLING!
    SHOP_NAME = 'ZenilPro'
    SHOP_DESCRIPTION = 'Premium Parfyumeriya Do\'koni'
    PRODUCTS_FILE = 'products.json'
    ORDERS_FILE = 'orders.json'
    USERS_FILE = 'users.json'
    DELIVERY_FREE = 500000
    DELIVERY_COST = 30000
    
    @classmethod
    def is_admin(cls, tid):
        return tid in cls.ADMIN_IDS if tid else False

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY
CORS(app)

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

# ==================== TELEGRAM BOT FUNCTIONS ====================
def send_telegram(chat_id, text, reply_markup=None):
    """Telegramga xabar yuborish"""
    url = f"https://api.telegram.org/bot{Config.BOT_TOKEN}/sendMessage"
    payload = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML'
    }
    if reply_markup:
        payload['reply_markup'] = json.dumps(reply_markup)
    
    try:
        r = requests.post(url, json=payload, timeout=10)
        return r.json()
    except Exception as e:
        print(f"Telegram xatolik: {e}")
        return None

def answer_callback(callback_id, text=None, url=None):
    """Callback query ga javob berish"""
    api_url = f"https://api.telegram.org/bot{Config.BOT_TOKEN}/answerCallbackQuery"
    payload = {'callback_query_id': callback_id}
    if text: payload['text'] = text
    if url: payload['url'] = url
    try:
        requests.post(api_url, json=payload, timeout=5)
    except:
        pass

def set_bot_commands():
    """Bot komandalarini o'rnatish"""
    url = f"https://api.telegram.org/bot{Config.BOT_TOKEN}/setMyCommands"
    commands = {
        "commands": [
            {"command": "start", "description": "Botni ishga tushirish"},
            {"command": "menu", "description": "Menyuni ochish"},
            {"command": "help", "description": "Yordam"},
            {"command": "admin", "description": "Admin panel"}
        ]
    }
    try:
        requests.post(url, json=commands, timeout=5)
        print("Bot komandalari o'rnatildi!")
    except Exception as e:
        print(f"Komanda o'rnatishda xatolik: {e}")

def get_ngrok_url():
    """ngrok orqali localhostni internetga chiqarish"""
    try:
        r = requests.get("http://127.0.0.1:4040/api/tunnels", timeout=3)
        data = r.json()
        for tunnel in data.get('tunnels', []):
            if tunnel.get('proto') == 'https':
                return tunnel.get('public_url')
    except:
        pass
    return None

def set_webhook(webhook_url=None):
    """Webhook o'rnatish"""
    if not webhook_url:
        webhook_url = get_ngrok_url()
        if not webhook_url:
            print("❌ ngrok ishlamayapti! ngrok ni ishga tushiring.")
            return False
    
    url = f"https://api.telegram.org/bot{Config.BOT_TOKEN}/setWebhook"
    payload = {'url': f"{webhook_url}/webhook"}
    
    try:
        r = requests.post(url, json=payload, timeout=10)
        data = r.json()
        if data.get('ok'):
            print(f"✅ Webhook o'rnatildi: {webhook_url}/webhook")
            return True
        else:
            print(f"❌ Webhook xatolik: {data}")
            return False
    except Exception as e:
        print(f"❌ Webhook o'rnatishda xatolik: {e}")
        return False

def delete_webhook():
    """Webhookni o'chirish (polling uchun)"""
    url = f"https://api.telegram.org/bot{Config.BOT_TOKEN}/deleteWebhook"
    try:
        requests.post(url, timeout=5)
    except:
        pass

# ==================== WEBHOOK ROUTE ====================
@app.route('/webhook', methods=['POST'])
def webhook():
    """Telegram dan kelgan barcha xabarlarni qabul qilish"""
    try:
        data = request.json
        print(f"📩 Webhook keldi: {json.dumps(data, indent=2)[:500]}")
        
        # Message
        if 'message' in data:
            message = data['message']
            chat_id = message['chat']['id']
            text = message.get('text', '')
            user = message.get('from', {})
            first_name = user.get('first_name', 'Foydalanuvchi')
            
            # /start komandasi
            if text == '/start':
                # Web App URL
                webapp_url = request.host_url.rstrip('/')
                
                welcome = f"""🎉 <b>Assalomu alaykum, {first_name}!</b>

🔥 <b>{Config.SHOP_NAME}</b> - {Config.SHOP_DESCRIPTION}

🛍 Bu yerda siz:
• 💎 Original parfyumeriya
• 🎨 Kosmetika
• 🍽️ Idish-tovoq
• 👕 Kiyim-kechak
• 🧴 Kir yuvish kukunlari

topishingiz mumkin!

<i>Do'konga kirish uchun pastdagi tugmani bosing:</i>"""

                # Inline keyboard - Do'konga kirish tugmasi
                reply_markup = {
                    'inline_keyboard': [
                        [{
                            'text': '🛍 Do\'konga kirish',
                            'web_app': {'url': webapp_url}
                        }],
                        [
                            {'text': '📞 Aloqa', 'callback_data': 'contact'},
                            {'text': 'ℹ️ Yordam', 'callback_data': 'help'}
                        ]
                    ]
                }
                
                send_telegram(chat_id, welcome, reply_markup)
                
                # Menu keyboard ham yuboramiz
                menu_markup = {
                    'keyboard': [
                        [{'text': '🛍 Katalog'}, {'text': '🛒 Savat'}],
                        [{'text': '❤️ Sevimlilar'}, {'text': '👤 Profil'}]
                    ],
                    'resize_keyboard': True,
                    'one_time_keyboard': False
                }
                send_telegram(chat_id, "Tez menyu:", menu_markup)
            
            # /menu komandasi
            elif text == '/menu' or text == '🛍 Katalog':
                webapp_url = request.host_url.rstrip('/')
                reply_markup = {
                    'inline_keyboard': [[{
                        'text': '🛍 Do\'konga kirish',
                        'web_app': {'url': webapp_url}
                    }]]
                }
                send_telegram(chat_id, "Do'konga kirish uchun bosing:", reply_markup)
            
            # /help komandasi
            elif text == '/help' or text == 'ℹ️ Yordam':
                help_text = f"""📚 <b>Yordam</b>

<b>Mavjud komandalar:</b>
/start - Botni ishga tushirish
/menu - Katalogga kirish
/help - Yordam

<b>Savollaringiz bo'lsa:</b>
@admin ga yozing"""
                send_telegram(chat_id, help_text)
            
            # /admin komandasi
            elif text == '/admin':
                user_id = user.get('id')
                if Config.is_admin(user_id):
                    webapp_url = request.host_url.rstrip('/')
                    send_telegram(chat_id, f"🔐 <b>Admin Panel</b>\n\nURL: {webapp_url}/admin\nParol: {Config.ADMIN_PASSWORD}")
                else:
                    send_telegram(chat_id, "❌ Siz admin emassiz!")
            
            # Savat tugmasi
            elif text == '🛒 Savat':
                send_telegram(chat_id, "Savatni Web App orqali ko'rishingiz mumkin. /menu bosing.")
            
            # Sevimlilar tugmasi
            elif text == '❤️ Sevimlilar':
                send_telegram(chat_id, "Sevimlilarni Web App orqali ko'rishingiz mumkin. /menu bosing.")
            
            # Profil tugmasi
            elif text == '👤 Profil':
                send_telegram(chat_id, "Profilingizni Web App da ko'rishingiz mumkin. /menu bosing.")
        
        # Callback Query (tugma bosilganda)
        elif 'callback_query' in data:
            callback = data['callback_query']
            callback_id = callback['id']
            callback_data = callback.get('data', '')
            chat_id = callback['message']['chat']['id']
            
            if callback_data == 'contact':
                answer_callback(callback_id, "Admin bilan bog'lanish uchun @admin ga yozing")
                send_telegram(chat_id, "📞 <b>Aloqa:</b>\n@admin ga yozing yoki /help bosing.")
            
            elif callback_data == 'help':
                answer_callback(callback_id, "Yordam ko'rsatilmoqda...")
                send_telegram(chat_id, "📚 Yordam uchun /help bosing.")
        
        return jsonify({'ok': True})
    
    except Exception as e:
        print(f"Webhook xatolik: {e}")
        return jsonify({'ok': False, 'error': str(e)})

# ==================== WEB ROUTES ====================
@app.route('/')
def index(): return render_template('index.html')

@app.route('/admin')
def admin(): return render_template('admin.html')

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
        
        # Adminlarga xabar yuborish
        for admin_id in Config.ADMIN_IDS:
            msg = f"🛍 <b>Yangi buyurtma!</b>\n━━━━━━━━━━━━━\n📦 ID: #{order['order_id']}\n👤 Mijoz: {order['customer_name']}\n📱 Tel: {order['phone']}\n💰 Jami: {order['total']:,} so'm"
            send_telegram(admin_id, msg)
        
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

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.clear(); return jsonify({'success': True})

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
    
    print("=" * 50)
    print(f"  🚀 {Config.SHOP_NAME} - Web App")
    print("=" * 50)
    print(f"  🌐 Web: http://localhost:5000")
    print(f"  🔐 Admin: http://localhost:5000/admin")
    print(f"  📱 Webhook: /webhook")
    print("=" * 50)
    
    # Bot komandalarini o'rnatish
    set_bot_commands()
    
    # Agar ngrok ishlasa, avtomatik webhook o'rnatish
    ngrok_url = get_ngrok_url()
    if ngrok_url:
        print(f"  🔗 Ngrok: {ngrok_url}")
        set_webhook(ngrok_url)
    else:
        print("  ⚠️  ngrok topilmadi!")
        print("  Webhook uchun ngrok ni ishga tushiring:")
        print("  ngrok http 5000")
        print("  Keyin: /set_webhook sahifasiga kiring")
    
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)