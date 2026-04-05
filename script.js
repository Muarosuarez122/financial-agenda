import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyArg2GNhsnlK7-JW0w-8D4tb46V2vAgZbQ",
  authDomain: "stee-53dc1.firebaseapp.com",
  projectId: "stee-53dc1",
  storageBucket: "stee-53dc1.firebasestorage.app",
  messagingSenderId: "737719774829",
  appId: "1:737719774829:web:7cabfa294cae4d6d861964",
  measurementId: "G-ZV3L9Z34VE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let globalUsersDb = JSON.parse(localStorage.getItem('global_supabase_mock')) || {};
let currentUser = null;
let currentFbUser = null;

function saveGlobalDB() {
    if(currentFbUser) {
        globalUsersDb[currentFbUser.uid] = currentUser;
        localStorage.setItem('global_supabase_mock', JSON.stringify(globalUsersDb));
    }
}

document.addEventListener('DOMContentLoaded', () => {

    // Auth DOM
    const authView = document.getElementById('authView');
    const appView = document.getElementById('appView');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const authError = document.getElementById('authError');
    
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value.trim();
        const pass = document.getElementById('authPassword').value.trim();
        if (!email || !pass) return;

        loginBtn.textContent = 'Procesando...';
        authError.style.display = 'none';

        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            if (error.code.includes('user-not-found') || error.code.includes('invalid-credential')) {
                try {
                    await createUserWithEmailAndPassword(auth, email, pass);
                } catch (err2) {
                    authError.textContent = 'Error: ' + err2.message;
                    authError.style.display = 'block';
                    loginBtn.textContent = 'Entrar / Registrarse';
                }
            } else {
                authError.textContent = 'Error: ' + error.message;
                authError.style.display = 'block';
                loginBtn.textContent = 'Entrar / Registrarse';
            }
        }
    });
    
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            location.reload();
        });
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentFbUser = user;
            if (!globalUsersDb[user.uid]) {
                const isAdmin = user.email.toLowerCase() === 'admin' || user.email.toLowerCase() === 'admin@admin.com';
                globalUsersDb[user.uid] = {
                    email: user.email,
                    isContractPro: isAdmin,
                    isManagerPro: isAdmin,
                    isBundle: isAdmin,
                    agendaTasks: [],
                    financeRecords: []
                };
                saveGlobalDB();
            } else {
                const isAdmin = user.email.toLowerCase() === 'admin' || user.email.toLowerCase() === 'admin@admin.com';
                if(isAdmin && !globalUsersDb[user.uid].isManagerPro) {
                    globalUsersDb[user.uid].isContractPro = true;
                    globalUsersDb[user.uid].isManagerPro = true;
                    globalUsersDb[user.uid].isBundle = true;
                    saveGlobalDB();
                }
            }
            currentUser = globalUsersDb[user.uid];
            showApp();
        } else {
            currentUser = null;
            currentFbUser = null;
            appView.style.display = 'none';
            authView.style.display = 'flex';
            loginBtn.textContent = 'Entrar / Registrarse';
        }
    });

    function showApp() {
        authView.style.display = 'none';
        appView.style.display = 'flex';
        document.getElementById('userEmailDisplay').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.email.charAt(0).toUpperCase();

        applyPlanFeatures();
        renderTasks();
        renderFinances();
    }

    // =========================================================
    // 2. TIER LOGIC & PRO UPGRADES
    // =========================================================
    const userPlanDisplay = document.getElementById('userPlanDisplay');
    const premiumBanner = document.getElementById('premiumBanner');
    const chartSection = document.getElementById('chartSection');
    const taskTierIndicator = document.getElementById('taskTierIndicator');
    const financeProLock = document.getElementById('financeProLock');

    function applyPlanFeatures() {
        if (currentUser.isBundle) {
            userPlanDisplay.textContent = "BUNDLE PRO (AMBAS APPS)";
            userPlanDisplay.className = "user-plan badge-pro";
        } else if (currentUser.isManagerPro) {
            userPlanDisplay.textContent = "MANAGER PRO";
            userPlanDisplay.className = "user-plan badge-pro";
        } else {
            userPlanDisplay.textContent = "PLAN GRATUITO";
            userPlanDisplay.className = "user-plan badge-free";
        }

        if (currentUser.isManagerPro || currentUser.isBundle) {
            premiumBanner.style.display = 'none';
            chartSection.classList.add('unlocked');
            taskTierIndicator.textContent = 'Tareas: Ilimitadas (PRO)';
            financeProLock.style.display = 'none';
        } else {
            premiumBanner.style.display = 'block';
            chartSection.classList.remove('unlocked');
            financeProLock.style.display = 'inline-block';
        }
    }

    // =========================================================
    // 3. NAVIGATION LOGIC
    // =========================================================
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.style.display = 'none');
            
            item.classList.add('active');
            document.getElementById(item.dataset.target).style.display = 'block';
        });
    });

    // =========================================================
    // 4. AGENDA MODULE
    // =========================================================
    const newTaskInput = document.getElementById('newTaskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');

    addTaskBtn.addEventListener('click', () => {
        const text = newTaskInput.value.trim();
        if(!text) return;

        if (!currentUser.isManagerPro && !currentUser.isBundle && currentUser.agendaTasks.length >= 5) {
            alert('Límite de la versión gratuita alcanzado (5 tareas máximo). Actualiza a PRO para tareas ilimitadas.');
            return;
        }

        currentUser.agendaTasks.push({ id: Date.now(), text, completed: false });
        saveGlobalDB();
        newTaskInput.value = '';
        renderTasks();
    });

    function renderTasks() {
        taskList.innerHTML = '';
        
        if(!currentUser.isManagerPro && !currentUser.isBundle) {
             taskTierIndicator.textContent = `Tareas: ${currentUser.agendaTasks.length}/5 (Gratis)`;
        }

        currentUser.agendaTasks.forEach(task => {
            const div = document.createElement('div');
            div.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            div.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                <span class="task-text">${task.text}</span>
                <button class="task-delete" data-id="${task.id}">🗑️</button>
            `;
            taskList.appendChild(div);
        });

        // Add Listeners
        document.querySelectorAll('.task-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = parseInt(e.target.dataset.id);
                const t = currentUser.agendaTasks.find(x => x.id === id);
                if(t) { t.completed = e.target.checked; saveGlobalDB(); renderTasks(); }
            });
        });
        document.querySelectorAll('.task-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                currentUser.agendaTasks = currentUser.agendaTasks.filter(x => x.id !== id);
                saveGlobalDB(); renderTasks();
            });
        });
    }

    // =========================================================
    // 5. FINANCE MODULE & CHART
    // =========================================================
    const addFinBtn = document.getElementById('addFinBtn');
    let finChart = null;

    addFinBtn.addEventListener('click', () => {
        const type = document.getElementById('finType').value;
        const desc = document.getElementById('finDesc').value;
        const amount = parseFloat(document.getElementById('finAmount').value);

        if(!desc || isNaN(amount)) return;

        currentUser.financeRecords.push({ id: Date.now(), type, desc, amount });
        saveGlobalDB();
        
        document.getElementById('finDesc').value = '';
        document.getElementById('finAmount').value = '';
        renderFinances();
    });

    function renderFinances() {
        let inc = 0, exp = 0;
        currentUser.financeRecords.forEach(r => {
            if(r.type === 'income') inc += r.amount;
            else exp += r.amount;
        });

        document.getElementById('totalIncome').textContent = '$' + inc.toFixed(2);
        document.getElementById('totalExpense').textContent = '$' + exp.toFixed(2);
        document.getElementById('totalBalance').textContent = '$' + (inc - exp).toFixed(2);

        renderChart(inc, exp);
    }

    function renderChart(income, expense) {
        if(!currentUser.isManagerPro && !currentUser.isBundle) return;

        const ctx = document.getElementById('financeChart').getContext('2d');
        if(finChart) finChart.destroy();

        finChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ingresos', 'Gastos'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#f8fafc' } }
                }
            }
        });
    }

    // =========================================================
    // 6. CHECKOUT & PAYPAL INTEGRATION
    // =========================================================
    const checkoutModal = document.getElementById('checkoutModal');
    const pricingCards = document.querySelectorAll('.pricing-card');
    let selectedAmount = '4.00';
    let selectedPlan = 'bundle';

    document.getElementById('upgradeBtn').addEventListener('click', () => {
        checkoutModal.classList.add('active');
    });
    document.getElementById('closeModal').addEventListener('click', () => {
        checkoutModal.classList.remove('active');
    });

    pricingCards.forEach(card => {
        card.addEventListener('click', () => {
            pricingCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedAmount = card.dataset.price;
            selectedPlan = card.dataset.plan;
        });
    });

    if (window.paypal) {
        window.paypal.Buttons({
            style: { layout: 'vertical', color: 'gold', shape: 'rect' },
            createOrder: function(data, actions) {
                return actions.order.create({
                    purchase_units: [{
                        amount: { value: selectedAmount, currency_code: 'USD' },
                        description: `Compra de: ${selectedPlan}`
                    }]
                });
            },
            onApprove: function(data, actions) {
                return actions.order.capture().then(function(details) {
                    checkoutModal.classList.remove('active');
                    
                    if (selectedPlan === 'bundle') {
                        currentUser.isBundle = true;
                        currentUser.isContractPro = true;
                        currentUser.isManagerPro = true;
                    } else {
                        currentUser.isManagerPro = true;
                    }

                    saveGlobalDB();
                    applyPlanFeatures();
                    renderFinances(); 
                    alert('¡Pago exitoso! Disfruta de ProManager.');
                });
            }
        }).render('#paypal-button-container');
    }
});
