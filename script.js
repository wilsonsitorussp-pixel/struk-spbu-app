const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzF4-bde1EnkAVzsCLmMFnempjcqXO08zy1XPFmS2U_g2XdpqbK4ylfsDTcVkraXwB7/exec'; 

let fullHistoryData = [];
let operatorList = [];
let bbmPrices = { "PERTALITE": 10000, "PERTAMAX": 12600, "PERTAMAX TURBO": 14400 };
let currentShift = 2;
let currentPompa = 12;
let base64Logo = "";
let editModeTransId = null;

window.onload = () => {
    generatePompaButtons();
    setDefaultTime();
    fetchInitialData();
};

function setDefaultTime() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('inWaktu').value = now.toISOString().slice(0,16);
}

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

function setShift(val) { currentShift = val; const btns = document.getElementById('shiftGroup').children; for(let btn of btns) btn.classList.remove('active'); btns[val-1].classList.add('active'); updatePreview(); }
function setPompa(val) { currentPompa = val; generatePompaButtons(); updatePreview(); }
function formatNumber(num) { return new Intl.NumberFormat('id-ID').format(num || 0); }

// --- HELPER UNTUK MEMBACA DATA DARI GOOGLE SHEETS DENGAN AMAN ---
function getVal(settingValue, defaultValue) {
    return (settingValue !== undefined && settingValue !== null) ? settingValue : defaultValue;
}
function getBool(settingValue, defaultValue) {
    if (settingValue !== undefined && settingValue !== null) {
        return String(settingValue).toLowerCase() === 'true';
    }
    return defaultValue;
}

// --- FETCH DATA ---
function fetchInitialData() {
    fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            fullHistoryData = data.history || [];
            renderHistoryTable();

            const s = data.settings;
            
            // Load Teks (Aman walau kolom sengaja dikosongkan)
            document.getElementById('setSpbuName').value = getVal(s.spbuName, 'SPBU POLONIA');
            document.getElementById('setSpbuCode').value = getVal(s.spbuCode, '11.201.106');
            document.getElementById('setSpbuAddress').value = getVal(s.spbuAddress, 'JL. Imam Bonjol\nTlp. 0614156892');
            document.getElementById('setFooterText').value = getVal(s.footerText, 'ANDA MENDAPAT SUBSIDI DARI PEMERINTAH.');
            
            // Load Basic Styling
            document.getElementById('setFont').value = getVal(s.fontSize, '12');
            document.getElementById('setLogo').value = getVal(s.logoSize, '100');
            document.getElementById('setPadTop').value = getVal(s.space_padTop, '10');
            document.getElementById('setPadBottom').value = getVal(s.space_padBottom, '15');
            document.getElementById('setLogoGap').value = getVal(s.space_logoGap, '5');

            // Load Advanced Styling (Aman dari tipe data Boolean)
            document.getElementById('stNameSize').value = getVal(s.style_nameSize, '14');
            document.getElementById('stNameBold').checked = getBool(s.style_nameBold, true);
            
            document.getElementById('stCodeSize').value = getVal(s.style_codeSize, '12');
            document.getElementById('stCodeBold').checked = getBool(s.style_codeBold, false);
            
            document.getElementById('stAddrSize').value = getVal(s.style_addrSize, '12');
            document.getElementById('stAddrBold').checked = getBool(s.style_addrBold, false);
            
            document.getElementById('stFooterSize').value = getVal(s.style_footerSize, '10');
            document.getElementById('stFooterBold').checked = getBool(s.style_footerBold, false);
            
            if(s.logo) {
                base64Logo = s.logo;
                const img = document.getElementById('logoPreview');
                img.src = base64Logo;
                img.style.display = 'inline-block';
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
        .catch(err => { alert("Gagal terhubung ke Database Apps Script."); document.getElementById('loadingOverlay').style.display = 'none'; });
}

// --- HISTORI MANAGEMENT ---
function renderHistoryTable() {
    const tbody = document.getElementById('historyTbody');
    tbody.innerHTML = '';
    const displayData = [...fullHistoryData].reverse();
    
    displayData.forEach(row => {
        const tr = document.createElement('tr');
        const statClass = row[11] === 'Direvisi' ? 'badge-revisi' : 'badge-asli';
        const statText = row[11] || 'Asli';
        
        tr.innerHTML = `
            <td>${row[0]}</td>
            <td><strong>${row[1]}</strong></td>
            <td>${row[4]}</td>
            <td>Rp ${formatNumber(row[7])}</td>
            <td><span class="badge ${statClass}">${statText}</span></td>
            <td>
                <button class="action-links" onclick="editTransaction('${row[1]}')">Edit</button> | 
                <button class="action-links del" onclick="deleteTransaction('${row[1]}')">Hapus</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function editTransaction(noTrans) {
    const row = fullHistoryData.find(r => String(r[1]) === String(noTrans));
    if(!row) return;

    editModeTransId = noTrans;
    
    try {
        const p = row[0].split(/[\s/:]/);
        const isoStr = `${p[2]}-${p[1]}-${p[0]}T${p[3]}:${p[4]}`;
        document.getElementById('inWaktu').value = isoStr;
    } catch(e){}

    document.getElementById('outTrans').innerText = row[1];
    setShift(row[2]);
    setPompa(row[3]);
    document.getElementById('inProduk').value = row[4];
    document.getElementById('inTotal').value = row[7];
    document.getElementById('inOperator').value = row[8];
    document.getElementById('inPlat').value = row[9];
    document.getElementById('inOdo').value = row[10];
    
    calculateVolume();
    
    document.getElementById('editAlert').classList.remove('d-none');
    document.getElementById('btnBatalEdit').classList.remove('d-none');
    document.getElementById('btnAcak').disabled = true;
    document.getElementById('btnProses').innerText = "💾 Cetak Revisi & Update Sheet";
    document.getElementById('btnProses').classList.replace('btn-primary', 'btn-warning');

    switchTab('tab-input', document.querySelectorAll('.nav-btn')[0]);
}

function cancelEdit() {
    editModeTransId = null;
    document.getElementById('editAlert').classList.add('d-none');
    document.getElementById('btnBatalEdit').classList.add('d-none');
    document.getElementById('btnAcak').disabled = false;
    document.getElementById('btnProses').innerText = "🖨️ Cetak & Simpan";
    document.getElementById('btnProses').classList.replace('btn-warning', 'btn-primary');
    document.getElementById('inTotal').value = '';
    setDefaultTime();
    generateRandomID();
}

function deleteTransaction(noTrans) {
    if(!confirm("Yakin ingin menghapus transaksi: " + noTrans + " ?")) return;
    
    document.getElementById('loadingOverlay').style.display = 'flex';
    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "deleteHistory", payload: { noTrans: noTrans } })
    })
    .then(res => res.json()).then(res => {
        if(res.status === 'success') {
            fullHistoryData = fullHistoryData.filter(r => String(r[1]) !== String(noTrans));
            renderHistoryTable();
            alert("Terhapus");
        } else { alert("Gagal menghapus."); }
        document.getElementById('loadingOverlay').style.display = 'none';
    });
}

// --- LOGIC LAINNYA ---
function renderOperatorUI() {
    const select = document.getElementById('inOperator');
    select.innerHTML = '';
    operatorList.forEach(op => {
        const opt = document.createElement('option');
        opt.value = op; opt.innerText = op; select.appendChild(opt);
    });
    const ul = document.getElementById('operatorList');
    ul.innerHTML = '';
    operatorList.forEach((op, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${op}</span> <button class="btn btn-danger" style="padding:4px 8px; font-size:12px;" onclick="removeOperator(${index})">Hapus</button>`;
        ul.appendChild(li);
    });
    updatePreview();
}

function addOperator() {
    const val = document.getElementById('newOperator').value.toUpperCase().trim();
    if(val && !operatorList.includes(val)) { operatorList.push(val); document.getElementById('newOperator').value = ''; renderOperatorUI(); }
}
function removeOperator(index) { operatorList.splice(index, 1); renderOperatorUI(); }

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
    document.getElementById('inVolume').value = (hargaStr > 0) ? (total / hargaStr).toFixed(2) : "0.00";
    updatePreview();
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            base64Logo = e.target.result;
            const img = document.getElementById('logoPreview');
            img.src = base64Logo;
            img.style.display = 'inline-block';
        }
        reader.readAsDataURL(file);
    }
}

function generateRandomID() {
    let newID;
    const existingIds = fullHistoryData.map(r => String(r[1]));
    do { newID = Math.floor(100000 + Math.random() * 900000).toString(); } 
    while (existingIds.includes(newID));
    document.getElementById('outTrans').innerText = newID;
}

function updatePreview() {
    const root = document.documentElement;
    document.getElementById('fontVal').innerText = document.getElementById('setFont').value;
    document.getElementById('logoVal').innerText = document.getElementById('setLogo').value;
    document.getElementById('padTopVal').innerText = document.getElementById('setPadTop').value;
    document.getElementById('padBottomVal').innerText = document.getElementById('setPadBottom').value;
    document.getElementById('logoGapVal').innerText = document.getElementById('setLogoGap').value;
    
    root.style.setProperty('--font-size', document.getElementById('setFont').value + 'px');
    root.style.setProperty('--logo-size', document.getElementById('setLogo').value + 'px');
    root.style.setProperty('--pad-top', document.getElementById('setPadTop').value + 'px');
    root.style.setProperty('--pad-bottom', document.getElementById('setPadBottom').value + 'px');
    root.style.setProperty('--logo-gap', document.getElementById('setLogoGap').value + 'px');

    root.style.setProperty('--spbu-name-size', Math.max(5, document.getElementById('stNameSize').value) + 'px');
    root.style.setProperty('--spbu-name-weight', document.getElementById('stNameBold').checked ? 'bold' : 'normal');
    
    root.style.setProperty('--spbu-code-size', Math.max(5, document.getElementById('stCodeSize').value) + 'px');
    root.style.setProperty('--spbu-code-weight', document.getElementById('stCodeBold').checked ? 'bold' : 'normal');
    
    root.style.setProperty('--spbu-addr-size', Math.max(5, document.getElementById('stAddrSize').value) + 'px');
    root.style.setProperty('--spbu-addr-weight', document.getElementById('stAddrBold').checked ? 'bold' : 'normal');
    
    root.style.setProperty('--footer-size', Math.max(5, document.getElementById('stFooterSize').value) + 'px');
    root.style.setProperty('--footer-weight', document.getElementById('stFooterBold').checked ? 'bold' : 'normal');

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

// --- SAVE / PRINT PROCESS ---
function saveSettingsToCloud() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    const payload = {
        action: "updateSettings",
        payload: {
            spbuName: document.getElementById('setSpbuName').value, spbuCode: document.getElementById('setSpbuCode').value,
            spbuAddress: document.getElementById('setSpbuAddress').value, footerText: document.getElementById('setFooterText').value,
            operators: JSON.stringify(operatorList), prices: JSON.stringify(bbmPrices), logo: base64Logo,
            logoSize: document.getElementById('setLogo').value, fontSize: document.getElementById('setFont').value,
            space_padTop: document.getElementById('setPadTop').value, space_padBottom: document.getElementById('setPadBottom').value, space_logoGap: document.getElementById('setLogoGap').value,
            style_nameSize: document.getElementById('stNameSize').value, style_nameBold: document.getElementById('stNameBold').checked,
            style_codeSize: document.getElementById('stCodeSize').value, style_codeBold: document.getElementById('stCodeBold').checked,
            style_addrSize: document.getElementById('stAddrSize').value, style_addrBold: document.getElementById('stAddrBold').checked,
            style_footerSize: document.getElementById('stFooterSize').value, style_footerBold: document.getElementById('stFooterBold').checked
        }
    };
    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) })
    .then(res => res.json()).then(res => {
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('Pengaturan Global Tersimpan!');
    });
}

async function processTransaction() {
    const btn = document.getElementById('btnProses');
    btn.disabled = true; btn.innerText = "Memproses...";

    if (!navigator.bluetooth) {
        window.print();
        executeSave(btn);
    } else {
        try {
            const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], optionalServices: ['0000af30-0000-1000-8000-00805f9b34fb'] });
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
            const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
            
            const encoder = new TextEncoder();
            const produk = document.getElementById('inProduk').value;
            const selOp = document.getElementById('inOperator');
            const opName = selOp.options.length ? selOp.value : "---";

            const receiptText = 
`\x1B\x40\x1B\x61\x01` + 
`PERTAMINA\n${document.getElementById('setSpbuName').value}\n${document.getElementById('setSpbuCode').value}\n${document.getElementById('setSpbuAddress').value}\n--------------------------------\n\x1B\x61\x00` + 
`Shift: ${currentShift}  No Trans: ${document.getElementById('outTrans').innerText}\nWaktu: ${document.getElementById('outWaktu').innerText}\n--------------------------------\n` +
`Pompa       : ${currentPompa}\nProduk      : ${produk}\nHarga/L     : Rp ${formatNumber(bbmPrices[produk])}\nVolume      : ${document.getElementById('inVolume').value} L\nTotal       : Rp ${formatNumber(document.getElementById('inTotal').value)}\nOperator    : ${opName}\n--------------------------------\n` +
`CASH          ${formatNumber(document.getElementById('inTotal').value)}\n--------------------------------\nPlat        : ${document.getElementById('inPlat').value.toUpperCase()}\nOdo Meter   : ${document.getElementById('inOdo').value}\n--------------------------------\n` +
`\x1B\x61\x01${document.getElementById('setFooterText').value}\n\n`;

            let textBytes = encoder.encode(receiptText);
            for (let i = 0; i < textBytes.length; i += 100) await char.writeValue(textBytes.slice(i, i + 100));
            executeSave(btn);
        } catch (error) {
            console.error('Bluetooth error:', error);
            window.print();
            executeSave(btn);
        }
    }
}

function executeSave(btnRef) {
    const produk = document.getElementById('inProduk').value;
    const payload = {
        waktu: document.getElementById('outWaktu').innerText, noTrans: document.getElementById('outTrans').innerText,
        shift: currentShift, pompa: currentPompa, produk: produk, harga: bbmPrices[produk], volume: document.getElementById('inVolume').value,
        total: document.getElementById('inTotal').value, operator: document.getElementById('inOperator').value,
        plat: document.getElementById('inPlat').value, odometer: document.getElementById('inOdo').value
    };

    const actionData = editModeTransId ? "updateHistory" : "saveHistory";

    fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: actionData, payload: payload }) })
    .then(res => res.json()).then(res => {
        if(res.status === 'success') {
            if(editModeTransId) {
                const rowIndex = fullHistoryData.findIndex(r => String(r[1]) === String(editModeTransId));
                if(rowIndex > -1) fullHistoryData[rowIndex] = [payload.waktu, payload.noTrans, payload.shift, payload.pompa, payload.produk, payload.harga, payload.volume, payload.total, payload.operator, payload.plat, payload.odometer, "Direvisi"];
                cancelEdit(); 
            } else {
                fullHistoryData.push([payload.waktu, payload.noTrans, payload.shift, payload.pompa, payload.produk, payload.harga, payload.volume, payload.total, payload.operator, payload.plat, payload.odometer, "Asli"]);
                generateRandomID(); 
                document.getElementById('inTotal').value = '';
            }
            renderHistoryTable();
            updatePreview();
        } else { alert('Gagal: ' + res.message); }
    }).finally(() => {
        btnRef.disabled = false;
        btnRef.innerText = editModeTransId ? "💾 Cetak Revisi & Update Sheet" : "🖨️ Cetak & Simpan";
    });
}
