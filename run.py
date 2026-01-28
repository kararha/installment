# -*- coding: utf-8 -*-
"""
نظام إدارة المبيعات بالتقسيط
Arabic Installment Sales Management System
Desktop Application Launcher with PyWebView
"""

import webview
import threading
from app import app

def run_flask():
    """تشغيل خادم Flask"""
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)

if __name__ == '__main__':
    # تشغيل Flask في خيط منفصل
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # إنشاء نافذة PyWebView
    webview.create_window(
        title='نظام إدارة المبيعات بالتقسيط',
        url='http://127.0.0.1:5000',
        width=1200,
        height=800,
        min_size=(800, 600),
        resizable=True,
        text_select=True
    )
    
    # بدء التطبيق
    webview.start()
