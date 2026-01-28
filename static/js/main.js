/**
 * نظام إدارة المبيعات بالتقسيط
 * Arabic Installment Sales Management System
 * Main JavaScript File
 */

// ==================== المتغيرات العامة ====================
let currentCustomerId = null;
let customersData = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 7; // عدد العملاء في الصفحة الواحدة

// ==================== دوال المساعدة ====================

/**
 * تنسيق الأرقام بفواصل
 */
function formatNumber(num) {
    return parseFloat(num).toLocaleString('ar-IQ', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * عرض رسالة توست
 */
function showToast(type, message) {
    const toast = document.getElementById('toast');
    const toastBody = toast.querySelector('.toast-body');
    
    toast.classList.remove('success', 'error');
    toast.classList.add(type === 'success' ? 'success' : 'error');
    toastBody.textContent = message;
    
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
}

/**
 * تبديل الشريط الجانبي
 */
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('collapsed');
}

/**
 * التمرير للتقارير
 */
function scrollToReports() {
    const reportsSection = document.getElementById('reportsSection');
    if (reportsSection) {
        reportsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * البحث العام
 */
function handleGlobalSearch(event) {
    if (event.key === 'Enter') {
        const search = event.target.value.trim();
        if (search) {
            // تحديث حقل البحث في الجدول
            const searchInput = document.getElementById('searchInput');
            if (searchInput) {
                searchInput.value = search;
                searchCustomers();
            }
        }
    }
}

// ==================== دوال الإحصائيات ====================

/**
 * تحميل الملخص العام
 */
async function loadSummary() {
    try {
        const response = await fetch('/api/reports/summary');
        const data = await response.json();
        
        // تحديث الإحصائيات
        const totalCustomersEl = document.getElementById('totalCustomers');
        if (totalCustomersEl) {
            totalCustomersEl.textContent = data.total_customers;
            document.getElementById('totalDebt').textContent = formatNumber(data.total_debt);
            document.getElementById('totalPaid').textContent = formatNumber(data.total_paid);
            document.getElementById('totalRemaining').textContent = formatNumber(data.total_remaining);
            
            // تحديث التقارير
            document.getElementById('paidOffCustomers').textContent = data.paid_off_customers;
            document.getElementById('activeCustomers').textContent = data.active_customers;
            
            // حساب نسبة التحصيل
            const collectionRate = data.total_debt > 0 
                ? ((data.total_paid / data.total_debt) * 100).toFixed(1) 
                : 0;
            document.getElementById('collectionRate').textContent = `${collectionRate}%`;
        }
        
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

// ==================== دوال العملاء ====================

/**
 * تحميل قائمة العملاء
 */
async function loadCustomers(search = '', page = 1) {
    try {
        let url = `/api/customers?page=${page}&per_page=${ITEMS_PER_PAGE}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        customersData = data.customers;
        currentPage = data.current_page;
        
        displayCustomers(customersData);
        renderPagination(data);
        
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

/**
 * عرض العملاء في الجدول
 */
function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('customersTable');
    const paginationContainer = document.getElementById('paginationContainer');
    
    if (!tbody) return;
    
    if (customers.length === 0) {
        table.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    table.style.display = 'table';
    if (paginationContainer) paginationContainer.style.display = 'flex';
    emptyState.style.display = 'none';
    
    // حساب التسلسل بناءً على الصفحة الحالية
    const startCount = (currentPage - 1) * ITEMS_PER_PAGE;
    
    tbody.innerHTML = customers.map((customer, index) => `
        <tr onclick="showQuickActions(${customer.id}, '${customer.name}')" style="cursor: pointer;">
            <td>${startCount + index + 1}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600;">
                        ${customer.name.charAt(0)}
                    </div>
                    <span>${customer.name}</span>
                </div>
            </td>
            <td>${customer.phone}</td>
            <td>${formatNumber(customer.total_debt)} دينار</td>
            <td class="text-success">${formatNumber(customer.total_paid)} دينار</td>
            <td class="${customer.remaining_balance > 0 ? 'text-danger' : 'text-success'}">${formatNumber(customer.remaining_balance)} دينار</td>
            <td>
                <span class="badge ${customer.is_paid_off ? 'status-paid' : 'status-pending'}">
                    ${customer.is_paid_off ? 'مسدد' : 'متبقي'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); window.location.href='/customer/${customer.id}'">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * رسم عناصر التنقل بين الصفحات
 */
function renderPagination(data) {
    const { total, pages, current_page, per_page } = data;
    const paginationControls = document.getElementById('paginationControls');
    
    // تحديث نص المعلومات
    const start = (current_page - 1) * per_page + 1;
    const end = Math.min(current_page * per_page, total);
    
    document.getElementById('showingStart').textContent = start;
    document.getElementById('showingEnd').textContent = end;
    document.getElementById('totalItems').textContent = total;
    
    if (pages <= 1) {
        paginationControls.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // زر السابق
    html += `
        <li class="page-item ${current_page === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${current_page - 1}); return false;">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    // أرقام الصفحات
    for (let i = 1; i <= pages; i++) {
        if (i === 1 || i === pages || (i >= current_page - 1 && i <= current_page + 1)) {
            html += `
                <li class="page-item ${i === current_page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === current_page - 2 || i === current_page + 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // زر التالي
    html += `
        <li class="page-item ${current_page === pages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${current_page + 1}); return false;">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    paginationControls.innerHTML = html;
}

/**
 * تغيير الصفحة
 */
function changePage(page) {
    if (page < 1) return;
    const search = document.getElementById('searchInput').value.trim();
    loadCustomers(search, page);
}

/**
 * البحث عن العملاء
 */
function searchCustomers() {
    const search = document.getElementById('searchInput').value.trim();
    currentPage = 1; // إعادة تعيين للصفحة الأولى عند البحث
    loadCustomers(search, 1);
}

/**
 * إضافة عميل جديد
 */
async function addCustomer(event) {
    event.preventDefault();
    
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const initial_debt = parseFloat(document.getElementById('customerDebt').value) || 0;
    
    try {
        const response = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, phone, initial_debt })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', data.message);
            
            // تحديث البيانات
            loadSummary();
            loadCustomers();
            
            // إغلاق المودال وإعادة تعيين النموذج
            bootstrap.Modal.getInstance(document.getElementById('addCustomerModal')).hide();
            document.getElementById('addCustomerForm').reset();
        } else {
            showToast('error', data.error);
        }
    } catch (error) {
        showToast('error', 'حدث خطأ أثناء إضافة العميل');
    }
}

/**
 * عرض الإجراءات السريعة
 */
function showQuickActions(customerId, customerName) {
    currentCustomerId = customerId;
    document.getElementById('quickActionCustomerId').value = customerId;
    document.getElementById('quickActionsTitle').innerHTML = `
        <i class="bi bi-person-circle"></i>
        ${customerName}
    `;
    
    new bootstrap.Modal(document.getElementById('quickActionsModal')).show();
}

/**
 * فتح مودال إضافة مديونية
 */
async function openDebtModal() {
    bootstrap.Modal.getInstance(document.getElementById('quickActionsModal')).hide();
    
    const customer = customersData.find(c => c.id === currentCustomerId);
    if (customer) {
        document.getElementById('debtCustomerId').value = currentCustomerId;
        document.getElementById('debtCustomerInfo').innerHTML = `
            <div class="avatar">${customer.name.charAt(0)}</div>
            <div class="info">
                <h6>${customer.name}</h6>
                <small>الرصيد الحالي: ${formatNumber(customer.remaining_balance)} دينار</small>
            </div>
        `;
    }
    
    setTimeout(() => {
        new bootstrap.Modal(document.getElementById('addDebtModal')).show();
    }, 200);
}

/**
 * فتح مودال تسديد قسط
 */
async function openPaymentModal() {
    bootstrap.Modal.getInstance(document.getElementById('quickActionsModal')).hide();
    
    const customer = customersData.find(c => c.id === currentCustomerId);
    if (customer) {
        document.getElementById('paymentCustomerId').value = currentCustomerId;
        document.getElementById('remainingBalanceHint').textContent = formatNumber(customer.remaining_balance);
        document.getElementById('paymentCustomerInfo').innerHTML = `
            <div class="avatar">${customer.name.charAt(0)}</div>
            <div class="info">
                <h6>${customer.name}</h6>
                <small>الرصيد المتبقي: ${formatNumber(customer.remaining_balance)} دينار</small>
            </div>
        `;
    }
    
    setTimeout(() => {
        new bootstrap.Modal(document.getElementById('payInstallmentModal')).show();
    }, 200);
}

/**
 * الانتقال لصفحة تفاصيل العميل
 */
function viewCustomerDetails() {
    bootstrap.Modal.getInstance(document.getElementById('quickActionsModal')).hide();
    window.location.href = `/customer/${currentCustomerId}`;
}

/**
 * تأكيد حذف العميل
 */
function confirmDeleteCustomer() {
    bootstrap.Modal.getInstance(document.getElementById('quickActionsModal')).hide();
    
    setTimeout(() => {
        new bootstrap.Modal(document.getElementById('deleteConfirmModal')).show();
    }, 200);
}

/**
 * حذف العميل
 */
async function deleteCustomer() {
    try {
        const response = await fetch(`/api/customers/${currentCustomerId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', data.message);
            loadSummary();
            loadCustomers();
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
        } else {
            showToast('error', data.error);
        }
    } catch (error) {
        showToast('error', 'حدث خطأ أثناء حذف العميل');
    }
}

/**
 * إضافة مديونية جديدة
 */
async function addDebt(event) {
    event.preventDefault();
    
    const customerId = document.getElementById('debtCustomerId').value;
    const amount = document.getElementById('debtAmount').value;
    const description = document.getElementById('debtDescription').value;
    
    try {
        const response = await fetch(`/api/customers/${customerId}/add-debt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, description })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', data.message);
            loadSummary();
            loadCustomers();
            
            bootstrap.Modal.getInstance(document.getElementById('addDebtModal')).hide();
            document.getElementById('addDebtForm').reset();
        } else {
            showToast('error', data.error);
        }
    } catch (error) {
        showToast('error', 'حدث خطأ أثناء إضافة المديونية');
    }
}

/**
 * تسديد قسط
 */
async function payInstallment(event) {
    event.preventDefault();
    
    const customerId = document.getElementById('paymentCustomerId').value;
    const amount = document.getElementById('paymentAmount').value;
    const description = document.getElementById('paymentDescription').value;
    
    try {
        const response = await fetch(`/api/customers/${customerId}/pay-installment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, description })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('success', data.message);
            loadSummary();
            loadCustomers();
            
            bootstrap.Modal.getInstance(document.getElementById('payInstallmentModal')).hide();
            document.getElementById('payInstallmentForm').reset();
        } else {
            showToast('error', data.error);
        }
    } catch (error) {
        showToast('error', 'حدث خطأ أثناء تسجيل الدفعة');
    }
}

// ==================== تهيئة التطبيق ====================

// إخفاء الشريط الجانبي على الشاشات الصغيرة
if (window.innerWidth <= 992) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.add('collapsed');
    }
}

// إغلاق الشريط الجانبي عند النقر خارجه على الهواتف
document.addEventListener('click', function(event) {
    if (window.innerWidth <= 992) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.querySelector('.sidebar-toggle');
        
        if (sidebar && !sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
            sidebar.classList.remove('show');
        }
    }
});
