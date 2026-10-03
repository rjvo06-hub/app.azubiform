const micIconSVG = `
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"></path>
    <path stroke-linecap="round" stroke-linejoin="round" d="M19 10v1a7 7 0 01-14 0v-1M12 18.5V23M8 23h8"></path>
`;

const stopIconSVG = `
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"></rect>
`;

export function inicializarVoz() {
    window.toggleSpeechRecognition = function(inputId, btnId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Dein Browser unterstützt keine Spracherkennung.");
            return;
        }

        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        const svgIcon = document.getElementById('icon-' + btnId);

        if (window.currentRecognition && window.currentActiveInput === inputId) {
            window.currentRecognition.stop();
            window.currentRecognition = null;
            resetBtnRec(btn, svgIcon);
            return;
        }

        if (window.currentRecognition) {
            window.currentRecognition.stop();
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'de-DE';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        window.currentRecognition = recognition;
        window.currentActiveInput = inputId;

        let textoBase = input.value;
        if (textoBase.length > 0 && !textoBase.endsWith(' ')) {
            textoBase += ' ';
        }

        btn.classList.remove('text-gray-400', 'hover:text-indigo-600', 'hover:text-amber-600');
        btn.classList.add('text-red-600', 'animate-pulse');
        svgIcon.innerHTML = stopIconSVG;

        recognition.onresult = function(event) {
            let textoIntermedio = '';
            let textoFinal = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    textoFinal += event.results[i][0].transcript;
                } else {
                    textoIntermedio += event.results[i][0].transcript;
                }
            }

            if (textoFinal) {
                textoBase += textoFinal + ' ';
            }

            input.value = textoBase + textoIntermedio;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };

        recognition.onerror = function(event) {
            console.error("Speech recognition error:", event.error);
            if (event.error === 'not-allowed') {
                alert("Zugriff auf das Mikrofon verweigert. Bitte erlaube den Mikrofonzugriff in deinem Browser.");
            }
            resetBtnRec(btn, svgIcon);
        };

        recognition.onend = function() {
            resetBtnRec(btn, svgIcon);
            window.currentRecognition = null;
            window.currentActiveInput = null;
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Could not start recognition:", e);
            resetBtnRec(btn, svgIcon);
        }
    };
}

function resetBtnRec(btn, svgIcon) {
    btn.classList.remove('text-red-600', 'animate-pulse');
    btn.classList.add('text-gray-400');
    svgIcon.innerHTML = micIconSVG;

    if (btn.id.includes('Pasada')) {
        btn.classList.add('hover:text-amber-600');
    } else {
        btn.classList.add('hover:text-indigo-600');
    }
}

document.addEventListener("visibilitychange", function() {
    if (!document.hidden && window.currentRecognition) {
        try {
            window.currentRecognition.stop();
        } catch (e) {}
        window.currentRecognition = null;
        window.currentActiveInput = null;
        
        const btn1 = document.getElementById('btnVozActividad');
        const svg1 = document.getElementById('icon-btnVozActividad');
        if (btn1 && svg1) resetBtnRec(btn1, svg1);

        const btn2 = document.getElementById('btnVozPasada');
        const svg2 = document.getElementById('icon-btnVozPasada');
        if (btn2 && svg2) resetBtnRec(btn2, svg2);
    }
});