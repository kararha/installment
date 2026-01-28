# -*- coding: utf-8 -*-
"""
نظام إدارة المبيعات بالتقسيط
Arabic Installment Sales Management System
Main Flask Application
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for
from models import db, Customer, Transaction, init_db
import os
import sys
import time

# إنشاء التطبيق
app = Flask(__name__)

# إعدادات التطبيق
if getattr(sys, 'frozen', False):
    basedir = os.path.dirname(sys.executable)
else:
    basedir = os.path.abspath(os.path.dirname(__file__))

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'database.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'installment-sales-secret-key-2024'
app.config['JSON_AS_ASCII'] = False

# تهيئة قاعدة البيانات
init_db(app)

# إعدادات الأيقونة
app.config['APP_ICON'] = 'static/images/icon.ico'

@app.context_processor
def inject_icon():
    import random
    return dict(app_icon=app.config['APP_ICON'], random=lambda: random.randint(1000, 9999))


# ==================== الصفحات الرئيسية ====================

@app.route('/')
def index():
    """الصفحة الرئيسية - لوحة التحكم"""
    return render_template('index.html')


@app.route('/customer/<int:customer_id>')
def customer_details(customer_id):
    """صفحة تفاصيل العميل"""
    customer = Customer.query.get_or_404(customer_id)
    return render_template('customer_details.html', customer=customer)


# ==================== API للعملاء ====================

@app.route('/api/customers', methods=['GET'])
def get_customers():
    """الحصول على قائمة العملاء مع تقسيم النتائج (Pagination)"""
    search = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    query = Customer.query
    
    if search:
        query = query.filter(
            (Customer.name.contains(search)) | 
            (Customer.phone.contains(search))
        )
    
    # استخدام Pagination
    pagination = query.order_by(Customer.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'customers': [c.to_dict() for c in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': pagination.page,
        'per_page': pagination.per_page,
        'has_next': pagination.has_next,
        'has_prev': pagination.has_prev
    })


@app.route('/api/customers', methods=['POST'])
def add_customer():
    """إضافة عميل جديد"""
    data = request.get_json()
    
    name = data.get('name', '').strip()
    phone = data.get('phone', '').strip()
    initial_debt = float(data.get('initial_debt', 0))
    
    if not name:
        return jsonify({'error': 'الرجاء إدخال اسم العميل'}), 400
    
    if not phone:
        return jsonify({'error': 'الرجاء إدخال رقم الهاتف'}), 400
    
    customer = Customer(
        name=name,
        phone=phone,
        initial_debt=initial_debt
    )
    
    db.session.add(customer)
    db.session.commit()
    
    return jsonify({
        'message': 'تم إضافة العميل بنجاح',
        'customer': customer.to_dict()
    }), 201


@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer(customer_id):
    """الحصول على بيانات عميل محدد"""
    customer = Customer.query.get_or_404(customer_id)
    return jsonify(customer.to_dict())


@app.route('/api/customers/<int:customer_id>', methods=['PUT'])
def update_customer(customer_id):
    """تحديث بيانات عميل"""
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    
    if 'name' in data:
        customer.name = data['name'].strip()
    if 'phone' in data:
        customer.phone = data['phone'].strip()
    
    db.session.commit()
    
    return jsonify({
        'message': 'تم تحديث البيانات بنجاح',
        'customer': customer.to_dict()
    })


@app.route('/api/customers/<int:customer_id>', methods=['DELETE'])
def delete_customer(customer_id):
    """حذف عميل"""
    customer = Customer.query.get_or_404(customer_id)
    
    db.session.delete(customer)
    db.session.commit()
    
    return jsonify({'message': 'تم حذف العميل بنجاح'})


# ==================== API للمعاملات ====================

@app.route('/api/customers/<int:customer_id>/transactions', methods=['GET'])
def get_transactions(customer_id):
    """الحصول على معاملات عميل"""
    customer = Customer.query.get_or_404(customer_id)
    transactions = Transaction.query.filter_by(customer_id=customer_id)\
        .order_by(Transaction.created_at.desc()).all()
    return jsonify([t.to_dict() for t in transactions])


@app.route('/api/customers/<int:customer_id>/add-debt', methods=['POST'])
def add_debt(customer_id):
    """إضافة مديونية جديدة"""
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    
    amount = float(data.get('amount', 0))
    description = data.get('description', '').strip()
    
    if amount <= 0:
        return jsonify({'error': 'الرجاء إدخال مبلغ صحيح'}), 400
    
    transaction = Transaction(
        customer_id=customer_id,
        amount=amount,
        transaction_type='debt',
        description=description or 'مديونية جديدة'
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'message': 'تم إضافة المديونية بنجاح',
        'transaction': transaction.to_dict(),
        'customer': customer.to_dict()
    }), 201


@app.route('/api/customers/<int:customer_id>/pay-installment', methods=['POST'])
def pay_installment(customer_id):
    """تسديد قسط"""
    customer = Customer.query.get_or_404(customer_id)
    data = request.get_json()
    
    amount = float(data.get('amount', 0))
    description = data.get('description', '').strip()
    
    if amount <= 0:
        return jsonify({'error': 'الرجاء إدخال مبلغ صحيح'}), 400
    
    if amount > customer.remaining_balance:
        return jsonify({'error': 'المبلغ المدخل أكبر من الرصيد المتبقي'}), 400
    
    transaction = Transaction(
        customer_id=customer_id,
        amount=amount,
        transaction_type='payment',
        description=description or 'تسديد قسط'
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'message': 'تم تسجيل الدفعة بنجاح',
        'transaction': transaction.to_dict(),
        'customer': customer.to_dict()
    }), 201


@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    """حذف معاملة"""
    transaction = Transaction.query.get_or_404(transaction_id)
    customer_id = transaction.customer_id
    
    db.session.delete(transaction)
    db.session.commit()
    
    customer = Customer.query.get(customer_id)
    
    return jsonify({
        'message': 'تم حذف المعاملة بنجاح',
        'customer': customer.to_dict() if customer else None
    })


# ==================== API للتقارير ====================

@app.route('/api/reports/summary', methods=['GET'])
def get_summary():
    """الحصول على ملخص عام"""
    customers = Customer.query.all()
    
    total_customers = len(customers)
    total_debt = sum(c.total_debt for c in customers)
    total_paid = sum(c.total_paid for c in customers)
    total_remaining = sum(c.remaining_balance for c in customers)
    paid_off_customers = sum(1 for c in customers if c.is_paid_off)
    
    return jsonify({
        'total_customers': total_customers,
        'total_debt': round(total_debt, 2),
        'total_paid': round(total_paid, 2),
        'total_remaining': round(total_remaining, 2),
        'paid_off_customers': paid_off_customers,
        'active_customers': total_customers - paid_off_customers
    })


# ==================== تشغيل التطبيق ====================

if __name__ == '__main__':
    app.run(debug=True, port=5000)
