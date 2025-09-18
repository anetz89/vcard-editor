const DOWNLOADBTN = document.getElementById('downloadBtn');
const VCARD = document.getElementById('vcardContent');
DOWNLOADBTN.addEventListener('click', downloadVCard);
document.getElementById('fileInput').addEventListener('change', onFileSelected);

const VALUE_PATTERNS = {
    'FN': /^[\w\s.,'-]+$/, // Full Name
    'N': /^[\w\s.,'-]+;[\w\s.,'-]+;[\w\s.,'-]*;[\w\s.,'-]*;[\w\s.,'-]*$/, // Name
    'EMAIL': /^[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}$/, // Email
    'TEL': /^\+?[0-9\s()-]+$/, // Telephone
    'ADR': /^[\w\s.,'-]+;[\w\s.,'-]+;[\w\s.,'-]*;[\w\s.,'-]*;[\w\s.,'-]*;[\w\s.,'-]*;[\w\s.,'-]*$/, // Address
    'ORG': /^[\w\s.,'-]+$/, // Organization
    'TITLE': /^[\w\s.,'-]+$/, // Title
    'URL': /^(https?:\/\/[^\s]+)$/, // URL
    'NOTE': /^[\w\s.,'-]*$/, // Note
    'BDAY': /^\d{4}-\d{2}-\d{2}$/, // Birthday (YYYY-MM-DD)
    'GENDER': /^(M|F|O)$/, // Gender (M, F, O)
    'IMPP': /^[\w\s.,'-]+$/, // Instant Messaging
    'X-ABLABEL': /^[\w\s.,'-]+$/, // Custom label
    // Add more fields as needed
};
const VALID_KEYS = /^(BEGIN|END|SOURCE|KIND|XML|FN|N|NICKNAME|PHOTO|BDAY|ANNIVERSARY|GENDER|ADR|TEL|EMAIL|IMPP|LANG|TZ|GEO|TITLE|ROLE|LOGO|ORG|MEMBER|RELATED|CATEGORIES|NOTE|PRODID|REV|SOUND|UID|CLIENTPIDMAP|URL|VERSION|KEY|FBURL|CALADRURI|CALURI)(;(.*=.*\,?)*)?$/;

let vCardDataModel = []; // Internal data model to store vCard data
let currentPage;

// for debug purpose to avoid data upload every time
displayVCard("BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nN:Doe;John;;;\nTEL;TYPE=WORK,VOICE:+1234567890\nTEL;TYPE=HOME,VOICE:+0987654321\nEMAIL:john.doe@example.com\nEND:VCARD\n\nBEGIN:VCARD\nVERSION:3.0\nFN:John Zwo\nN:Zwo;John;;;\nTEL;TYPE=WORK,VOICE:+1234567890\nTEL;TYPE=HOME,VOICE:+0987654321\nEMAIL:john.doe@example.com\nEND:VCARD");

function onFileSelected(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const vCardData = e.target.result;
            displayVCard(vCardData);
        };
        reader.readAsText(file);
    }
}

function displayVCard(vCardData) {
    VCARD.innerHTML = '';

    // Initialize the internal data model
    vCardDataModel = [];

    const vCardEntity = vCardData.split('\n\n');

    vCardEntity.forEach(parseEntity);

    if(vCardDataModel.length) {
        currentPage = 1;

        renderContent();
        renderNavigation();

        VCARD.classList.remove('hidden');
        DOWNLOADBTN.classList.remove('hidden');

        // Validate all inputs after displaying the vCard
        onInputChanged()
    }
}

function displayNavigation() {
    vCardDataModel.length
}

function parseEntity(vCardData, index) {
    const lines = vCardData.split('\n');
    const table = document.createElement('table');
    const vCardDataEntry = {
        metadata: {
            version: null,
            index: index
        },
        data: {},
        domelement: table
    };
    table.className = 'table table-bordered';

    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':');

        if (line === '' || line.startsWith('BEGIN') || line.startsWith('END')) { return; } // Do not display lines

        if (line.startsWith('VERSION')) {
            vCardDataEntry.metadata.version = value;
            return;
        }

        if (!VALID_KEYS.test(key)) {
            alert(`invalid key: ${key}`);
            return; // Do not display invalid keys
        }

        // Store the key-value pair in the internal data model
        vCardDataEntry.data[key] = value;

        const row = document.createElement('tr');

        const labelCell = document.createElement('td');
        labelCell.className = 'table-label font-weight-bold';
        labelCell.textContent = key;
        row.appendChild(labelCell);

        const inputCell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.value = value;
        input.setAttribute('data-key', key); // Store the key for validation
        inputCell.appendChild(input);
        row.appendChild(inputCell);

        // Add real-time validation and update the internal data model on input change
        input.addEventListener('input', function() {
            vCardDataModel[index].data[key] = input.value; // Update the internal data model
            onInputChanged();
        });

        table.appendChild(row);
    });
    vCardDataModel.push(vCardDataEntry);
}

function onInputChanged() {
    validateAllInputs();
    
    // debug display of the data model
    const dataModelDisplay = document.getElementById('dataModelDisplay');
    dataModelDisplay.textContent = JSON.stringify(vCardDataModel, null, 2); // Format JSON with indentation
}

function validateInput(key, value) {
    const pattern = VALUE_PATTERNS[key] || /.*/; // Default to allow any value if no specific pattern
    return pattern.test(value);
}

function validateAllInputs() {
    const inputs = VCARD.getElementsByTagName('input');
    let validInput = true;

    Array.from(inputs).forEach(input => {
        const key = input.getAttribute('data-key');
        const value = input.value;
        
        if (validateInput(key, value)) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            validInput = false;
        }
    });

    DOWNLOADBTN.disabled = !validInput;
}

function downloadVCard() {
    const version = document.getElementById('vcardVersion').value;

    const vCardData = [];

    // prepare data
    vCardDataModel.forEach(entity => {
        vCardData.push(...[
            'BEGIN:VCARD',
            `VERSION:${version}`,
            ...Object.entries(prepare(entity.data, version)).map(([key, value]) => `${key}:${value}`),
            'END:VCARD',
            ''
        ]);
    });

    // logic to trigger download
    const blob = new Blob([vCardData.join('\n')], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `edited_vcard_${version}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function prepare(dataModel, version) {
    const keysToDelete = {
       '2.1': ['ANNIVERSARY', 'CALADRURI', 'CALURI', 'CATEGORIES', 'CLASS', 'CLIENTPIDMAP', 'FBURL', 'GENDER', 'IMPP', 'KIND', 'MEMBER', 'NAME', 'NICKNAME', 'PRODID', 'PROFILE', 'RELATED', 'SORT-STRING', 'SOURCE', 'XML'],
       '3.0': ['ANNIVERSARY', 'CATEGORIES', 'KIND', 'LANG', 'MEMBER', 'RELATED', 'XML' ],
       '4.0': ['AGENT', 'CLASS', 'MAILER', 'NAME', 'PROFILE']
    };
    let model = JSON.parse(JSON.stringify(dataModel));

    // "repair" data if needed
    switch(version) {
        case '2.1':
            if (!model['N']) {
                if(model['FN']) {
                    model['N'] = model['FN'];
                } else {
                    alert('no N defined!');
                    return; // Incompatible if mandatory fields are missing
                }
            }
            break;
        case '3.0':
            break;
        case '4.0':
            // TODO handle LABEL, SORT-STRING
            break;
        default: alert('unknown version');
    }

    // remove keys that are not valid for the current version
    keysToDelete[version].forEach(key => {
        delete model[key];
    });

    return model;
}



function renderContent() {
    VCARD.innerHTML = '';
    VCARD.append(vCardDataModel[currentPage - 1].domelement);
    validateAllInputs();
}

function renderNavigationItem(i) {
    const navItem = document.createElement('span');
    navItem.className = 'nav-item' + (i === currentPage ? ' active' : '');
    
    switch(i){
        case 0:
            navItem.textContent = '<';
            break;
        case vCardDataModel.length + 1:
            navItem.textContent = '>';
            break;
        default:
            navItem.textContent = i;
            break;
    }

    navItem.onclick = () => {
        switch(i){
            case 0:
                currentPage = (currentPage > 1)? currentPage - 1: currentPage;
                break;
            case vCardDataModel.length + 1:
                currentPage = (currentPage < vCardDataModel.length)? currentPage + 1: currentPage;
                break;
            default:
                currentPage = i;
                break;
        }
        renderContent();
        renderNavigation();
    };
    return navItem;
}

function renderNavigation() {
    const navigationDiv = document.getElementById('navigation');
    navigationDiv.innerHTML = '';

    const totalPages = vCardDataModel.length;
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    navigationDiv.appendChild(renderNavigationItem(0));
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= startPage && i <= endPage)) {
            navigationDiv.appendChild(renderNavigationItem(i));
        } else if (i === startPage - 1 || i === endPage + 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            navigationDiv.appendChild(ellipsis);
        }
    }
    navigationDiv.appendChild(renderNavigationItem(totalPages + 1));
}