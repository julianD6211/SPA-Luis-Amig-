/**
 * ==========================================================================
 * LÓGICA DE LA APLICACIÓN (SPA ROUTING & COMPONENTES) - SISTEMAS AMIGÓ
 * Desarrollado para el curso de Introducción a la Ingeniería de Sistemas
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    const supabaseConfig = window.SUPABASE_CONFIG || {};
    const supabaseClient = window.supabase && supabaseConfig.url && supabaseConfig.anonKey
        ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
        : null;

    // --- Configuración e Inicialización de Rutas ---
    const VIEWS_TITLES = {
        'inicio': 'Inicio',
        'unidad1': 'Unidad 1: Fundamentos',
        'unidad2': 'Unidad 2: Algoritmia',
        'unidad3': 'Unidad 3: Tendencias',
        'hojasdevida': 'Hojas de Vida'
    };

    /**
     * Sistema de Ruteo SPA Basado en Hash (#)
     * Permite navegación fluida sin recargas, soportando botones de adelante/atrás del navegador.
     */
    function routeSPA() {
        // Obtener el hash actual de la URL, por defecto será 'inicio'
        const currentHash = window.location.hash.substring(1) || 'inicio';
        
        // 1. Obtener todas las secciones de vista
        const sections = document.querySelectorAll('.view-section');
        let targetExists = false;

        sections.forEach(section => {
            if (section.id === currentHash) {
                section.classList.add('active');
                targetExists = true;
            } else {
                section.classList.remove('active');
            }
        });

        // Caso alternativo si la ruta no existe (redirige a inicio)
        if (!targetExists) {
            window.location.hash = '#inicio';
            return;
        }

        // 2. Actualizar estado visual de los enlaces de navegación (Sidebar)
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('data-target') === currentHash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // 3. Cambiar título del header dinámicamente
        const headerTitle = document.getElementById('currentViewTitle');
        if (headerTitle) {
            headerTitle.textContent = VIEWS_TITLES[currentHash] || 'Inicio';
        }

        // 4. Reiniciar scroll al tope del contenedor principal para mejorar la usabilidad
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTop = 0;
        }

        // 5. Cerrar menú lateral en móvil después de navegar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.remove('mobile-active');
        }
    }

    // Registrar oyente de eventos para cambios en el Hash
    window.addEventListener('hashchange', routeSPA);
    
    // Ejecutar ruteo en la carga inicial de la página
    routeSPA();


    // --- Soporte de Botones "Explorar" en Inicio ---
    const exploreButtons = document.querySelectorAll('.explore-btn');
    exploreButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const destination = btn.getAttribute('data-go');
            if (destination) {
                window.location.hash = destination;
            }
        });
    });


    // --- Menú Hamburguesa Responsivo para Móviles ---
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');

    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que el click se propague al body
            sidebar.classList.toggle('mobile-active');
        });

        // Cerrar menú si el usuario hace click en el contenedor principal (fuera del sidebar)
        document.querySelector('.main-content').addEventListener('click', () => {
            if (sidebar.classList.contains('mobile-active')) {
                sidebar.classList.remove('mobile-active');
            }
        });
    }


    // ==========================================================================
    // AUTENTICACIÓN LOCAL Y FORO DE CHAT GLOBAL
    // ==========================================================================
    const USERS_STORAGE_KEY = 'sistemas-amigo-users';
    const SESSION_STORAGE_KEY = 'sistemas-amigo-session';
    const authModal = document.getElementById('authModal');
    const authTitle = document.getElementById('authTitle');
    const authDescription = document.getElementById('authDescription');
    const authFeedback = document.getElementById('authFeedback');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authSwitch = document.getElementById('authSwitch');
    const currentUserName = document.getElementById('currentUserName');
    const logoutButton = document.getElementById('logoutButton');
    const authModeButtons = document.querySelectorAll('[data-auth-mode]');
    let currentUser = supabaseClient ? null : readStorage(SESSION_STORAGE_KEY);

    function readStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || null;
        } catch (error) {
            return null;
        }
    }

    function getUsers() {
        return readStorage(USERS_STORAGE_KEY) || [];
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    async function hashPassword(password) {
        const encodedPassword = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', encodedPassword);
        return Array.from(new Uint8Array(hashBuffer))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
    }

    function setSession(user) {
        currentUser = { id: user.id, name: user.name, email: user.email };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
        updateAuthUI();
        if (supabaseClient) ensureUserProfile(currentUser);
    }

    function updateAuthUI() {
        const loggedIn = Boolean(currentUser);
        currentUserName.textContent = loggedIn ? currentUser.name : '';
        currentUserName.classList.toggle('hidden', !loggedIn);
        authModeButtons.forEach(button => button.classList.toggle('hidden', loggedIn));
        logoutButton.classList.toggle('hidden', !loggedIn);
        chatInput.disabled = !loggedIn;
        chatInput.placeholder = loggedIn ? 'Escribe un mensaje...' : 'Inicia sesión para escribir';
    }

    async function ensureUserProfile(user) {
        const { error } = await supabaseClient.from('users').upsert({
            id: user.id,
            name: user.name,
            email: user.email
        }, { onConflict: 'id' });

        if (error) console.error('No fue posible guardar el perfil:', error.message);
    }

    function setAuthMode(mode) {
        const isLogin = mode === 'login';
        authTitle.textContent = isLogin ? 'Iniciar sesión' : 'Crear cuenta';
        authDescription.textContent = isLogin
            ? 'Ingresa para participar en el foro con tu nombre.'
            : 'Regístrate para compartir tus aportes con el grupo.';
        loginForm.classList.toggle('hidden', !isLogin);
        registerForm.classList.toggle('hidden', isLogin);
        authSwitch.textContent = isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
        authSwitch.dataset.authMode = isLogin ? 'register' : 'login';
        authFeedback.textContent = '';
    }

    function openAuthModal(mode = 'login') {
        setAuthMode(mode);
        authModal.classList.add('open');
        authModal.setAttribute('aria-hidden', 'false');
        window.setTimeout(() => {
            document.querySelector('.auth-form:not(.hidden) input')?.focus();
        }, 0);
    }

    function closeAuthModal() {
        authModal.classList.remove('open');
        authModal.setAttribute('aria-hidden', 'true');
        authFeedback.textContent = '';
    }

    authModeButtons.forEach(button => {
        button.addEventListener('click', () => openAuthModal(button.dataset.authMode));
    });
    authSwitch.addEventListener('click', () => setAuthMode(authSwitch.dataset.authMode));
    document.getElementById('authClose').addEventListener('click', closeAuthModal);
    authModal.addEventListener('click', event => {
        if (event.target === authModal) closeAuthModal();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && authModal.classList.contains('open')) closeAuthModal();
    });

    registerForm.addEventListener('submit', async event => {
        event.preventDefault();
        const name = document.getElementById('registerName').value.trim();
        const email = document.getElementById('registerEmail').value.trim().toLowerCase();
        const password = document.getElementById('registerPassword').value;

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { name } }
            });

            if (error) {
                authFeedback.textContent = error.message;
                return;
            }

            if (!data.session) {
                authFeedback.textContent = 'Revisa tu correo para confirmar la cuenta antes de ingresar.';
                return;
            }

            setSession({ id: data.user.id, name, email });
            await loadRemoteMessages();
            registerForm.reset();
            closeAuthModal();
            return;
        }

        const users = getUsers();

        if (users.some(user => user.email === email)) {
            authFeedback.textContent = 'Ese correo ya está registrado.';
            return;
        }

        const user = { name, email, passwordHash: await hashPassword(password) };
        users.push(user);
        saveUsers(users);
        setSession(user);
        registerForm.reset();
        closeAuthModal();
    });

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;

        if (supabaseClient) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) {
                authFeedback.textContent = 'Correo o contraseña incorrectos.';
                return;
            }

            setSession({
                id: data.user.id,
                name: data.user.user_metadata?.name || email.split('@')[0],
                email
            });
            await loadRemoteMessages();
            loginForm.reset();
            closeAuthModal();
            return;
        }

        const passwordHash = await hashPassword(password);
        const user = getUsers().find(candidate => candidate.email === email && candidate.passwordHash === passwordHash);

        if (!user) {
            authFeedback.textContent = 'Correo o contraseña incorrectos.';
            return;
        }

        setSession(user);
        loginForm.reset();
        closeAuthModal();
    });

    logoutButton.addEventListener('click', async () => {
        if (supabaseClient) await supabaseClient.auth.signOut();
        currentUser = null;
        localStorage.removeItem(SESSION_STORAGE_KEY);
        updateAuthUI();
    });

    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    updateAuthUI();

    // Desplazar chat al último mensaje al cargar
    function scrollChatToBottom() {
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function renderRemoteMessage(message) {
        const messageElement = document.createElement('div');
        const isOwnMessage = currentUser && message.user_id === currentUser.id;
        messageElement.classList.add('chat-message', isOwnMessage ? 'sent' : 'received');
        const timeString = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `
            <span class="chat-user">${escapeHTML(message.user_name)}</span>
            <div class="chat-bubble">
                <p>${escapeHTML(message.content)}</p>
                <span class="chat-time">${timeString}</span>
            </div>
        `;
        chatMessages.appendChild(messageElement);
    }

    let remoteChatLoaded = false;
    let remoteChatChannel = null;

    async function loadRemoteMessages() {
        if (remoteChatLoaded || !currentUser) return;

        const { data, error } = await supabaseClient
            .from('chat_messages')
            .select('id, user_id, user_name, content, created_at')
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) {
            console.error('No fue posible cargar los mensajes:', error.message);
            return;
        }

        chatMessages.innerHTML = '';
        data.forEach(renderRemoteMessage);
        scrollChatToBottom();
        remoteChatLoaded = true;
        remoteChatChannel = supabaseClient.channel('chat-messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
                renderRemoteMessage(payload.new);
                scrollChatToBottom();
            })
            .subscribe();
    }

    async function initializeRemoteSession() {
        const { data } = await supabaseClient.auth.getSession();
        if (data.session) {
            setSession({
                id: data.session.user.id,
                name: data.session.user.user_metadata?.name || data.session.user.email.split('@')[0],
                email: data.session.user.email
            });
            await loadRemoteMessages();
        }
        supabaseClient.auth.onAuthStateChange((_event, session) => {
            if (session) {
                setSession({
                    id: session.user.id,
                    name: session.user.user_metadata?.name || session.user.email.split('@')[0],
                    email: session.user.email
                });
                loadRemoteMessages();
            } else {
                currentUser = null;
                remoteChatLoaded = false;
                if (remoteChatChannel) supabaseClient.removeChannel(remoteChatChannel);
                updateAuthUI();
            }
        });
    }

    if (supabaseClient) {
        initializeRemoteSession();
    }

    scrollChatToBottom();

    if (chatForm && chatInput && chatMessages) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                openAuthModal('login');
                return;
            }

            const textMessage = chatInput.value.trim();
            if (textMessage === '') return;

            if (supabaseClient) {
                const { error } = await supabaseClient.from('chat_messages').insert({
                    user_id: currentUser.id,
                    user_name: currentUser.name,
                    content: textMessage
                });
                if (error) {
                    authFeedback.textContent = 'No se pudo enviar el mensaje. Inténtalo nuevamente.';
                    return;
                }
                chatInput.value = '';
                return;
            }

            // 1. Crear estructura del mensaje enviado por el usuario
            const messageElement = document.createElement('div');
            messageElement.classList.add('chat-message', 'sent');

            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            messageElement.innerHTML = `
                <span class="chat-user">${escapeHTML(currentUser.name)}</span>
                <div class="chat-bubble">
                    <p>${escapeHTML(textMessage)}</p>
                    <span class="chat-time">${timeString}</span>
                </div>
            `;

            // 2. Insertar mensaje en el DOM
            chatMessages.appendChild(messageElement);
            chatInput.value = ''; // Limpiar el input
            scrollChatToBottom();

            // 3. Simular respuesta académica del foro (Mock AI/Profesor reply) después de un retraso
            simulateForoReply(textMessage);
        });
    }

    /**
     * Simula respuestas interactivas en el foro de chat basadas en palabras clave
     * para hacer la aplicación atractiva en la demostración académica.
     */
    function simulateForoReply(userMsg) {
        const lowerMsg = userMsg.toLowerCase();
        let replyText = "¡Interesante aporte! Como futuros ingenieros, es clave debatir sobre estos temas de sistemas.";
        let senderName = "Prof. Alejandro";

        if (lowerMsg.includes('hola') || lowerMsg.includes('buenos dias') || lowerMsg.includes('saludos')) {
            replyText = "¡Hola! Bienvenidos al foro del curso. ¿Tienen alguna duda de la Unidad actual?";
            senderName = "María Camila";
        } else if (lowerMsg.includes('unidad 1') || lowerMsg.includes('ética') || lowerMsg.includes('ley 842')) {
            replyText = "La Unidad 1 nos enseña que el software no es solo código, sino un impacto social regido por la Ley 842 de 2003.";
            senderName = "Prof. Alejandro";
        } else if (lowerMsg.includes('unidad 2') || lowerMsg.includes('algoritmo') || lowerMsg.includes('diagrama')) {
            replyText = "Para la Unidad 2, PSeInt ha sido clave para entender la lógica de ciclos y vectores. ¡Es el pilar de la algoritmia!";
            senderName = "Juan Esteban";
        } else if (lowerMsg.includes('unidad 3') || lowerMsg.includes('base de datos') || lowerMsg.includes('nube') || lowerMsg.includes('ia')) {
            replyText = "En la Unidad 3 vemos que la nube y las bases de datos SQL son los cimientos de cualquier sistema de información moderno.";
            senderName = "Prof. Alejandro";
        } else if (lowerMsg.includes('proyecto') || lowerMsg.includes('sustentacion') || lowerMsg.includes('exposicion')) {
            replyText = "¡Falta poco para la sustentación! Esta SPA demuestra lo aprendido en modularidad y usabilidad.";
            senderName = "Juan Esteban";
        }

        // Agregar retraso para simular escritura humana
        setTimeout(() => {
            const replyElement = document.createElement('div');
            replyElement.classList.add('chat-message', 'received');

            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            replyElement.innerHTML = `
                <span class="chat-user">${senderName}</span>
                <div class="chat-bubble">
                    <p>${replyText}</p>
                    <span class="chat-time">${timeString}</span>
                </div>
            `;

            chatMessages.appendChild(replyElement);
            scrollChatToBottom();
        }, 1500);
    }

    /**
     * Sanitiza cadenas de texto para evitar vulnerabilidades de inyección HTML (XSS)
     * Demostrando buenas prácticas de seguridad de la información.
     */
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});