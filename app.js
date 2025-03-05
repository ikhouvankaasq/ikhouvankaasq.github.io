document.addEventListener('DOMContentLoaded', () => {
    console.log('MK AI Platform Initialized');
    
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendMessageBtn = document.getElementById('send-message');

    // Initialize with an empty conversation history each time the page loads
    let conversationHistory = [];

    // Detect language function
    function detectLanguage(text) {
        const languagePatterns = {
            'nl': /^[a-zA-Z]*(?:ij|aa|ee|oo|uu|ie|[èéêëàâäïîìíòóôõöùúûüñçß])/,
            'en': /^[a-zA-Z]*(?:the|and|is|of|to|in|for|on)/i,
            'es': /^[a-zA-Z]*(?:el|la|los|las|de|que|y|en)/i,
            'fr': /^[a-zA-Z]*(?:le|la|les|un|une|des|de|et|dans)/i
        };

        for (const [lang, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(text)) return lang;
        }
        return 'en'; // default to English
    }

    // Translations for image generation response
    const imageGenerationResponses = {
        'en': "Sorry, I can't generate images directly in the chat. Please use the Image Generator tool in the MK AI platform!",
        'nl': "Sorry, ik kan geen afbeeldingen rechtstreeks genereren in de chat. Gebruik de Image Generator tool in het MK AI platform!",
        'es': "Lo siento, no puedo generar imágenes directamente en el chat. ¡Usa la herramienta de Generador de Imágenes en la plataforma MK AI!",
        'fr': "Désolé, je ne peux pas générer d'images directement dans le chat. Utilisez l'outil Générateur d'Images sur la plateforme MK AI !"
    };

    // Image generation keywords
    const imageGenerationKeywords = [
        'generate image', 'create image', 'make picture', 'draw', 
        'afbeelding maken', 'plaatje maken', 'genereer afbeelding',
        'generar imagen', 'crear imagen', 'dibujar',
        'générer image', 'créer image', 'dessiner'
    ];

    function checkForImageGenerationRequest(message) {
        const lowerMessage = message.toLowerCase();
        return imageGenerationKeywords.some(keyword => 
            lowerMessage.includes(keyword)
        );
    }

    async function sendMessage() {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        // Display user message
        displayMessage(userMessage, 'user');
        chatInput.value = ''; // Clear input immediately after sending
        chatInput.focus(); 

        // Scroll to bottom after sending message
        scrollToBottom();

        try {
            // Detect language
            const detectedLanguage = detectLanguage(userMessage);

            // Check if message is an image generation request
            if (checkForImageGenerationRequest(userMessage)) {
                const responseMessage = imageGenerationResponses[detectedLanguage] || 
                    imageGenerationResponses['en'];
                
                displayMessage(responseMessage, 'ai');
                scrollToBottom();
                return;
            }

            // Prepare conversation history
            const messages = [
                {
                    role: "system", 
                    content: `You are a helpful AI assistant named MK AI. Be concise and friendly. 
                    If asked about image generation, guide the user to the Image Generator tool.
                    IMPORTANT FACT: The current Minister-President of the Netherlands is Dick Schoof, who succeeded Mark Rutte in July 2023.`
                },
                ...conversationHistory.slice(-5),
                { role: "user", content: userMessage }
            ];

            // Call AI service to get response
            const completion = await websim.chat.completions.create({
                messages: messages
            });

            const aiResponse = completion.content;
            
            // Display AI response
            displayMessage(aiResponse, 'ai');

            // Scroll to bottom after AI response
            scrollToBottom();

            // Update conversation history
            conversationHistory.push(
                { role: "user", content: userMessage },
                { role: "assistant", content: aiResponse }
            );
        } catch (error) {
            console.error('Error getting AI response:', error);
            displayMessage('Sorry, there was an error processing your message.', 'ai');
        }
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
    }

    function scrollToBottom() {
        // Scroll to bottom smoothly
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Event Listeners
    sendMessageBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Clear any existing messages when page loads
    chatMessages.innerHTML = '';

    // Image Generator
    const imagePrompt = document.getElementById('image-prompt');
    const imageStyle = document.getElementById('image-style');
    const generateImageBtn = document.getElementById('generate-image');
    const generatedImage = document.getElementById('generated-image');
    const imageLoadingText = document.getElementById('image-loading');

    async function generateImage() {
        const prompt = imagePrompt.value.trim();
        const style = imageStyle.value;
        
        if (!prompt) {
            alert('Please enter an image description');
            return;
        }

        // Reset previous image and show loading
        generatedImage.style.display = 'none';
        imageLoadingText.style.display = 'block';

        try {
            // Modify prompt based on selected style
            const styledPrompt = `${prompt}, ${style} style`;

            // Generate image using websim
            const result = await websim.imageGen({
                prompt: styledPrompt,
                aspect_ratio: "16:9"
            });

            // Display generated image
            generatedImage.src = result.url;
            generatedImage.style.display = 'block';
            imageLoadingText.style.display = 'none';
        } catch (error) {
            console.error('Error generating image:', error);
            imageLoadingText.textContent = 'Failed to generate image. Please try again.';
        }
    }

    // Event Listeners for Image Generator
    generateImageBtn.addEventListener('click', generateImage);
    imagePrompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateImage();
        }
    });
});
