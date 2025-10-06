<?php
// chatbot.php - Backend chatbot endpoint

header("Content-Type: application/json");

// Enable CORS by allowing all origins
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// If it's a preflight OPTIONS request, return 200 response
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../../../vendor/autoload.php'; // Correct the path to autoload.php

use Dotenv\Dotenv;

// Load .env file
$dotenv = Dotenv::createImmutable(__DIR__);
$dotenv->load(); 

// Load database credentials from .env file
$host = $_ENV['DB_HOST'];
$db = $_ENV['DB_NAME'];
$user = $_ENV['DB_USER'];
$pass = $_ENV['DB_PASS'];

// Create a PDO instance for database connection
try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    // Log successful connection
    error_log("Database connection successful");
} catch (PDOException $e) {
    error_log("Database connection failed: " . $e->getMessage());
    echo json_encode(['error' => 'Database connection failed']);
    exit; // Stop further execution if the DB connection fails
}

// Ensure the chat_history table exists (if not, create it)
try {
    $createTableQuery = "
        CREATE TABLE IF NOT EXISTS chat_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_message TEXT NOT NULL,
            bot_response TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ";
    $pdo->exec($createTableQuery);
    error_log("Table 'chat_history' is ready.");
} catch (PDOException $e) {
    error_log("Error creating table: " . $e->getMessage());
    echo json_encode(['error' => 'Error creating table']);
    exit;
}

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

    // Save the user message to the database
    try {
        $stmt = $pdo->prepare("INSERT INTO chat_history (user_message) VALUES (:message)");
        $stmt->bindParam(':message', $userMessage);
        $stmt->execute();

        // Get a response from OpenAI
        $botResponse = getOpenAIResponse($userMessage);

        // Save bot response to the database
        $stmt = $pdo->prepare("INSERT INTO chat_history (bot_response) VALUES (:response)");
        $stmt->bindParam(':response', $botResponse);
        $stmt->execute();

        // Return the bot's response
        echo json_encode(['response' => $botResponse]);
    } catch (PDOException $e) {
        error_log('Database error: ' . $e->getMessage());
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['error' => 'No message received']);
}
?>
