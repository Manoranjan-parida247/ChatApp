

// Check if user is already logged in
const currentUser = getCurrentUser();

// If user is logged in and we're on login/register page, redirect to chat
if (currentUser) {
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.includes('register.html') ||
        window.location.pathname === '/' ||
        window.location.pathname === '') {
        window.location.href = 'chat.html';
    }
} else {
    // If user is not logged in and we're on chat page, redirect to login
    if (window.location.pathname.includes('chat.html')) {
        window.location.href = 'index.html';
    }
}


// checking login form
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const username = document.getElementById("firstName").value.trim();
        const password = document.getElementById("password").value;

        const user = authenticateUser(username, password);

        if(user){
            setCurrentUser(user);
            window.location.href = "chat.html";
        }else{
            alert("invalid username or password!");
        }
    })
}

//checking register form 
const registerForm = document.getElementById("register-form");

if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const firstName = document.getElementById("firstName").value.trim();
        const lastName = document.getElementById("lastName").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            alert("Confirm password not match with password");
            return;
        }

        //create user object
        const newUser = {
            firstName,
            lastName,
            password,
        }

        // add user to storage
        const res = addUser(newUser);

        if (res) {
            alert("registration successfull!, Now you can login");
            window.location.href = "index.html";
        } else {
            alert("User with this first name already exist, try a different first name");
        }
    });
}