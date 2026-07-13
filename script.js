const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxKIukJmIqGE4ZJfF7vyZGh41nXYHFzDtpZiFtzSZgN4NVTlnV06Lwh1FVAKUSP3NGY/exec'; 

let generatedIDs = [];
let operatorList = [];
let bbmPrices = { "PERTALITE": 10000, "PERTAMAX": 12600, "PERTAMAX TURBO": 14400 };
let currentShift = 2;
let currentPompa = 12;
let base64Logo = "";

// --- INIT APP ---
window.onload = () => {
    generatePompaButtons();
    setDefaultTime();
    fetchInitialData();
};

function setDefaultTime() {
    const now = new Date();
    // Format YYYY-MM-DDThh:mm (untuk input datetime-local)
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('inWaktu').value = now.toISOString().slice(0,16);
}

// Format waktu untuk struk: DD/MM/YYYY HH:MM:SS
function formatWaktuStruk(waktuInput) {
    if(!waktuInput) return "";
    const d = new Date(waktuInput);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:00`;
}

// --- UI LOGIC ---
function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if(btn) btn.classList.add('active');
}

function generatePompaButtons() {
    const container = document.getElementById('pompaGroup');
    container.innerHTML = '';
    for(let i = 1; i <= 12; i++) {
        const btn = document.createElement('button');
        btn.className = `btn-toggle ${i === currentPompa ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => setPompa(i);
        container.appendChild(btn);
    }
}

function setShift(val) {
    currentShift = val;
    const btns = document.getElementById('shiftGroup').children;
    for(let btn of btns) btn.classList.remove('active');
    btns[val-1].classList.add('active');
    updatePreview();
}

function setPompa(val) {
    currentPompa = val;
    generatePompaButtons(); // re-render to update active state
    updatePreview();
}

function formatNumber(num) {
    if(!num) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
}

// --- FETCH & DATA MANAGEMENT ---
function fetchInitialData() {
    fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            generatedIDs = data.ids;
            const s = data.settings;
            
            document.getElementById('setSpbuName').value = s.spbuName || 'SPBU POLONIA';
            document.getElementById('setSpbuCode').value = s.spbuCode || '11.201.106';
            document.getElementById('setSpbuAddress').value = s.spbuAddress || 'JL. Imam Bonjol, Medan Polonia\nTlp. 0614156892';
            document.getElementById('setFooterText').value = s.footerText || 'ANDA MENDAPAT SUBSIDI DARI PEMERINTAH.\nGUNAKAN SECARA BIJAK.';
            document.getElementById('setFont').value = s.fontSize || '12';
            document.getElementById('setLogo').value = s.logoSize || '100';
            
            if(s.logo) {
                base64Logo = s.logo;
                document.getElementById('logoPreview').src = base64Logo;
            }

            if (s.operators) operatorList = JSON.parse(s.operators);
            renderOperatorUI();

            if (s.prices) {
                bbmPrices = JSON.parse(s.prices);
                document.getElementById('pricePertalite').value = bbmPrices["PERTALITE"];
                document.getElementById('pricePertamax').value = bbmPrices["PERTAMAX"];
                document.getElementById('priceTurbo').value = bbmPrices["PERTAMAX TURBO"];
            }
            
            generateRandomID();
            updatePreview();
            document.getElementById('loadingOverlay').style.display = 'none';
        })
        .catch(err => {
            alert("Gagal terhubung ke Server Apps Script.");
            document.getElementById('loadingOverlay').style.display = 'none';
        });
}

// --- OPERATOR MANAGEMENT ---
function renderOperatorUI() {
    // Render dropdown list
    const select = document.getElementById('inOperator');
    select.innerHTML = '';
    operatorList.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op; opt.innerText = op;
        select.appendChild(opt);
    });

    // Render list di tab setting
    const ul = document.getElementById('operatorList');
    ul.innerHTML = '';
    operatorList.forEach((op, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${op}</span> <button class="btn-sm" onclick="removeOperator(${index})">Hapus</button>`;
        ul.appendChild(li);
    });
    updatePreview();
}

function addOperator() {
    const val = document.getElementById('newOperator').value.toUpperCase().trim();
    if(val && !operatorList.includes(val)) {
        operatorList.push(val);
        document.getElementById('newOperator').value = '';
        renderOperatorUI();
    }
}
function removeOperator(index) {
    operatorList.splice(index, 1);
    renderOperatorUI();
}

// --- PRICES & CALCULATIONS ---
function updatePrices() {
    bbmPrices["PERTALITE"] = parseFloat(document.getElementById('pricePertalite').value) || 0;
    bbmPrices["PERTAMAX"] = parseFloat(document.getElementById('pricePertamax').value) || 0;
    bbmPrices["PERTAMAX TURBO"] = parseFloat(document.getElementById('priceTurbo').value) || 0;
    calculateVolume();
}

function calculateVolume() {
    const produk = document.getElementById('inProduk').value;
    const total = parseFloat(document.getElementById('inTotal').value) || 0;
    const hargaStr = bbmPrices[produk];
    
    const vol = (hargaStr > 0) ? (total / hargaStr).toFixed(2) : "0.00";
    document.getElementById('inVolume').value = vol;
    updatePreview();
}

// --- LOGO UPLOAD (Base64) ---
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            base64Logo = e.target.result;
            document.getElementById('logoPreview').src = base64Logo;
        }
        reader.readAsDataURL(file);
    }
}

// --- CORE FUNCTIONS ---
function generateRandomID() {
    let newID;
    do { newID = Math.floor(100000 + Math.random() * 900000).toString(); } 
    while (generatedIDs.includes(newID));
    document.getElementById('outTrans').innerText = newID;
}

function updatePreview() {
    const fontSize = document.getElementById('setFont').value;
    const logoSize = document.getElementById('setLogo').value;
    document.getElementById('fontVal').innerText = fontSize;
    document.getElementById('logoVal').innerText = logoSize;
    document.documentElement.style.setProperty('--font-size', fontSize + 'px');
    document.documentElement.style.setProperty('--logo-size', logoSize + 'px');

    document.getElementById('outSpbuName').innerText = document.getElementById('setSpbuName').value;
    document.getElementById('outSpbuCode').innerText = document.getElementById('setSpbuCode').value;
    document.getElementById('outSpbuAddress').innerText = document.getElementById('setSpbuAddress').value;
    document.getElementById('outFooter').innerText = document.getElementById('setFooterText').value;
    
    document.getElementById('outWaktu').innerText = formatWaktuStruk(document.getElementById('inWaktu').value);
    document.getElementById('outShift').innerText = currentShift;
    document.getElementById('outPompa').innerText = currentPompa;
    
    const produk = document.getElementById('inProduk').value;
    document.getElementById('outProduk').innerText = produk;
    document.getElementById('outHarga').innerText = formatNumber(bbmPrices[produk]);
    
    const total = document.getElementById('inTotal').value;
    document.getElementById('outTotal').innerText = formatNumber(total);
    document.getElementById('outCash').innerText = formatNumber(total);
    
    document.getElementById('outVolume').innerText = document.getElementById('inVolume').value;
    
    const selOp = document.getElementById('inOperator');
    document.getElementById('outOperator').innerText = selOp.options.length ? selOp.value : "---";
    
    document.getElementById('outPlat').innerText = document.getElementById('inPlat').value.toUpperCase();
    document.getElementById('outOdo').innerText = document.getElementById('inOdo').value;
}

// --- API CALLS ---
function saveSettingsToCloud() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    const payload = {
        action: "updateSettings",
        payload: {
            spbuName: document.getElementById('setSpbuName').value,
            spbuCode: document.getElementById('setSpbuCode').value,
            spbuAddress: document.getElementById('setSpbuAddress').value,
            footerText: document.getElementById('setFooterText').value,
            operators: JSON.stringify(operatorList),
            prices: JSON.stringify(bbmPrices),
            fontSize: document.getElementById('setFont').value,
            logoSize: document.getElementById('setLogo').value,
            logo: base64Logo
        }
    };

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json())
    .then(res => {
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('Pengaturan Tersimpan!');
    }).catch(err => {
         document.getElementById('loadingOverlay').style.display = 'none';
         alert('Gagal menyimpan.');
    });
}

// Kombinasi: Print Dulu, Jika sukses/fallback selesai -> Langsung Simpan
async function printAndSave() {
    const btn = document.querySelector('.btn-print');
    btn.disabled = true;
    btn.innerText = "Memproses...";

    // 1. Eksekusi Print
    if (!navigator.bluetooth) {
        window.print(); // Fallback Browser Print
        executeSaveHistory(btn);
    } else {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
                optionalServices: ['0000af30-0000-1000-8000-00805f9b34fb']
            });
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

            const encoder = new TextEncoder();
            const CMD_INIT = '\x1B\x40';
            const CMD_ALIGN_CENTER = '\x1B\x61\x01';
            const CMD_ALIGN_LEFT = '\x1B\x61\x00';
            
            const produk = document.getElementById('inProduk').value;
            const selOp = document.getElementById('inOperator');
            const opName = selOp.options.length ? selOp.value : "---";

            const receiptText = 
CMD_INIT + CMD_ALIGN_CENTER + 
`PERTAMINA\n` + 
`${document.getElementById('setSpbuName').value}\n` + 
`${document.getElementById('setSpbuCode').value}\n` + 
`${document.getElementById('setSpbuAddress').value}\n` + 
`--------------------------------\n` + 
CMD_ALIGN_LEFT + 
`Shift: ${currentShift}  No Trans: ${document.getElementById('outTrans').innerText}\n` +
`Waktu: ${document.getElementById('outWaktu').innerText}\n` +
`--------------------------------\n` +
`Pompa       : ${currentPompa}\n` +
`Produk      : ${produk}\n` +
`Harga/L     : Rp ${formatNumber(bbmPrices[produk])}\n` +
`Volume      : ${document.getElementById('inVolume').value} L\n` +
`Total       : Rp ${formatNumber(document.getElementById('inTotal').value)}\n` +
`Operator    : ${opName}\n` +
`--------------------------------\n` +
`CASH          ${formatNumber(document.getElementById('inTotal').value)}\n` +
`--------------------------------\n` +
`Plat        : ${document.getElementById('inPlat').value.toUpperCase()}\n` +
`Odo Meter   : ${document.getElementById('inOdo').value}\n` +
`--------------------------------\n` +
CMD_ALIGN_CENTER + 
`${document.getElementById('setFooterText').value}\n\n`; // Spasi dipendekkan sesuai instruksi

            let textBytes = encoder.encode(receiptText);
            for (let i = 0; i < textBytes.length; i += 100) {
                await char.writeValue(textBytes.slice(i, i + 100));
            }
            executeSaveHistory(btn);
        } catch (error) {
            console.error('Bluetooth error:', error);
            window.print();
            executeSaveHistory(btn);
        }
    }
}

// 2. Eksekusi Simpan Data
function executeSaveHistory(btnRef) {
    const produk = document.getElementById('inProduk').value;
    const selOp = document.getElementById('inOperator');
    
    const payload = {
        waktu: document.getElementById('outWaktu').innerText,
        noTrans: document.getElementById('outTrans').innerText,
        shift: currentShift,
        pompa: currentPompa,
        produk: produk,
        harga: bbmPrices[produk],
        volume: document.getElementById('inVolume').value,
        total: document.getElementById('inTotal').value,
        operator: selOp.options.length ? selOp.value : "---",
        plat: document.getElementById('inPlat').value,
        odometer: document.getElementById('inOdo').value
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "saveHistory", payload: payload })
    }).then(res => res.json()).then(res => {
        btnRef.disabled = false;
        btnRef.innerText = "🖨️ Cetak Bluetooth & Simpan";
        if(res.status === 'success') {
            generatedIDs.push(payload.noTrans);
            generateRandomID(); // Reset ID
            document.getElementById('inTotal').value = ''; // Reset Form
            document.getElementById('inVolume').value = '';
            updatePreview();
        }
    }).catch(err => {
        btnRef.disabled = false;
        btnRef.innerText = "🖨️ Cetak Bluetooth & Simpan";
        alert("Gagal menyimpan ke Sheet, namun struk telah dicetak.");
    });
}
