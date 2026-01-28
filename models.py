# -*- coding: utf-8 -*-
"""
نماذج قاعدة البيانات - Database Models
نظام إدارة المبيعات بالتقسيط
"""

from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class Customer(db.Model):
    """نموذج العميل - Customer Model"""
    __tablename__ = 'customers'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    initial_debt = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # العلاقات
    transactions = db.relationship('Transaction', backref='customer', lazy=True, cascade='all, delete-orphan')
    
    @property
    def total_debt(self):
        """إجمالي المديونية = المديونية الأولية + المديونيات الجديدة"""
        new_debts = sum(t.amount for t in self.transactions if t.transaction_type == 'debt')
        return self.initial_debt + new_debts
    
    @property
    def total_paid(self):
        """إجمالي المدفوعات"""
        return sum(t.amount for t in self.transactions if t.transaction_type == 'payment')
    
    @property
    def remaining_balance(self):
        """الرصيد المتبقي = إجمالي المديونية - المدفوعات"""
        return self.total_debt - self.total_paid
    
    @property
    def is_paid_off(self):
        """هل تم سداد كامل المديونية"""
        return self.remaining_balance <= 0
    
    def to_dict(self):
        """تحويل البيانات إلى قاموس"""
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'initial_debt': self.initial_debt,
            'total_debt': self.total_debt,
            'total_paid': self.total_paid,
            'remaining_balance': self.remaining_balance,
            'is_paid_off': self.is_paid_off,
            'created_at': self.created_at.strftime('%Y-%m-%d')
        }


class Transaction(db.Model):
    """نموذج المعاملات - Transaction Model"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'debt' أو 'payment'
    description = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """تحويل البيانات إلى قاموس"""
        return {
            'id': self.id,
            'customer_id': self.customer_id,
            'amount': self.amount,
            'transaction_type': self.transaction_type,
            'transaction_type_ar': 'مديونية جديدة' if self.transaction_type == 'debt' else 'تسديد قسط',
            'description': self.description,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M')
        }


def init_db(app):
    """تهيئة قاعدة البيانات"""
    db.init_app(app)
    with app.app_context():
        db.create_all()
