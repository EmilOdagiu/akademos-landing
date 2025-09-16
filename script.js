// Custom validation messages
document.getElementById('distributor-form').addEventListener('submit', function(e) {
    const email = document.getElementById('email');
    
    // Custom email validation message
    if (!email.validity.valid) {
        if(email.validity.valueMissing) {
            email.setCustomValidity('Please enter your email address');
        } else if(email.validity.typeMismatch) {
            email.setCustomValidity('Please enter a valid email address');
        }
    } else {
        email.setCustomValidity('');
    }
});

// Clear custom validation when user starts typing
document.getElementById('email').addEventListener('input', function() {
    this.setCustomValidity('');
});

// Simple FAQ toggle functionality
document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        answer.classList.toggle('active');
        question.querySelector('span').textContent = answer.classList.contains('active') ? '−' : '+';
    });
});

// Form submission handling
document.getElementById('distributor-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitBtn = this.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Get hCaptcha response
    const hCaptchaResponse = grecaptcha.getResponse();
    
    // Validate CAPTCHA
    if (!hCaptchaResponse) {
        alert('Please complete the CAPTCHA verification');
        return;
    }
    
    try {
        // Show loading state
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;
        
        const formData = new FormData(this);
        formData.append('h-captcha-response', hCaptchaResponse);
        
        const response = await fetch('https://akademos.md/submit', {
            method: 'POST',
            body: formData
        });
        
        // Check if response is OK before parsing JSON
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Show success popup/notification
            alert('Thank you! We will contact you shortly.');
            this.reset(); // Clear the form
        } else {
            // Show error message
            alert('Error: ' + (result.error || 'Something went wrong'));
        }
        
    } catch (error) {
        console.error('Error:', error);
        alert('Network error. Please try again.');
    } finally {
        // Reset CAPTCHA and button state
        grecaptcha.reset();
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
});

// Advanced Magnify on Hover Effect
document.querySelectorAll('.product-image').forEach(container => {
    const img = container.querySelector('img');
    const zoomLevel = 1.3; // How much to zoom in.
    
    container.addEventListener('mousemove', (e) => {
        // 1. Calculate mouse position relative to the image
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 2. Calculate the percentage position
        const xPercent = Math.round(100 / rect.width * x);
        const yPercent = Math.round(100 / rect.height * y);
        
        // 3. Set the zoom origin to the mouse position AND apply the zoom
        img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        img.style.transform = `scale(${zoomLevel})`; // Apply the zoom via JS
    });
    
    // Reset the zoom and origin when mouse leaves
    container.addEventListener('mouseleave', () => {
        img.style.transformOrigin = 'center center';
        img.style.transform = 'scale(1)'; // Reset to original size
    });
});

// Language menu toggle and outside click handling
(function(){
    const switchers = document.querySelectorAll('.language-switcher');
    switchers.forEach(sw => {
        const toggle = sw.querySelector('.language-toggle');
        const menu = sw.querySelector('.language-menu');
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = menu.classList.toggle('open');
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
    });
    document.addEventListener('click', () => {
        document.querySelectorAll('.language-menu.open').forEach(m => m.classList.remove('open'));
        document.querySelectorAll('.language-toggle[aria-expanded="true"]').forEach(t => t.setAttribute('aria-expanded', 'false'));
    });
    
    // Add 'current' class to active language
    function setCurrentLanguage() {
        const path = window.location.pathname;
        let currentLang = 'en'; // default to English
        
        // Detect language from URLs
        if (path.startsWith('/ru/') || path === '/ru') {
            currentLang = 'ru';
        } else if (path.startsWith('/en/') || path === '/en') {
            currentLang = 'en';
        }
        
        // Remove current class from all links
        document.querySelectorAll('.language-menu a.current').forEach(link => {
            link.classList.remove('current');
        });
        
        // Add current class to active language link
        const currentLink = document.querySelector(`.language-menu a[href*="/${currentLang}/"]`);
        if (currentLink) {
            currentLink.classList.add('current');
        }
        
        // Update the toggle button flag
        const toggleImg = document.querySelector('.language-toggle img');
        if (toggleImg) {
            if (currentLang === 'ru') {
                toggleImg.src = 'https://flagcdn.com/ru.svg';
                toggleImg.alt = 'Русский';
            } else {
                toggleImg.src = 'https://flagcdn.com/gb.svg';
                toggleImg.alt = 'English';
            }
        }
    }

    // Run on page load
    setCurrentLanguage();
})();