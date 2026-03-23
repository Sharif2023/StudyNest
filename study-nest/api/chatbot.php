<?php
// chatbot.php - Backend chatbot endpoint

require_once __DIR__ . '/db.php'; // Provides $pdo, CORS headers, and session_start()

// OpenAI configuration
// We can use the .env loader from db.php which already populated $_ENV
$apiKey = $_ENV['OPENAI_API_KEY'] ?? null;
$apiUrl = 'https://api.openai.com/v1/chat/completions';

$apiKey = $_ENV['OPENAI_API_KEY']; // Load API key from .env file
$apiUrl = 'https://api.openai.com/v1/chat/completions'; // OpenAI API URL for chat models

// Log if API key is correctly loaded
error_log("API Key loaded: " . (isset($apiKey) ? "Yes" : "No"));

// Function to handle chat messages and return OpenAI responses
function getOpenAIResponse($message) {
    global $apiKey, $apiUrl;

    // Prepare data for newer GPT models like gpt-3.5-turbo
    $data = [
        'model' => 'gpt-3.5-turbo',  // You can change to the latest available model
        'messages' => [
            ['role' => 'user', 'content' => $message], // Format for chat models
        ],
        'max_tokens' => 150,
        'temperature' => 0.7, // Adjust for creativity
    ];

    // Initialize cURL
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    // Get API response
    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        error_log('cURL error: ' . curl_error($ch)); // Log cURL errors
    }

    curl_close($ch);

    error_log("OpenAI Response: " . $response); // Log the raw API response

    // Decode the response from OpenAI API
    $responseData = json_decode($response, true);

    if (isset($responseData['choices'][0]['message']['content'])) {
        return $responseData['choices'][0]['message']['content'];
    } else {
        return 'Sorry, I could not understand that. Could you please rephrase your question?';
    }
}

// Capture incoming data (chat message)
$data = json_decode(file_get_contents("php://input"), true);

if (isset($data['message'])) {
    $userMessage = $data['message'];

    try {
        // 1) Get a response from OpenAI first
        $botResponse = getOpenAIResponse($userMessage);

        // 2) Save both to the database in one row
        $stmt = $pdo->prepare("INSERT INTO chat_history (user_message, bot_response) VALUES (?, ?)");
        $stmt->execute([$userMessage, $botResponse]);

        // 3) Return the bot's response
        echo json_encode(['response' => $botResponse]);
    } catch (Throwable $e) {
        error_log('Chatbot error: ' . $e->getMessage());
        echo json_encode(['error' => 'Chatbot error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'No message received']);
}
?>
