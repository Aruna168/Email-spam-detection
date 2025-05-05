from flask import Flask, request, jsonify
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib
from flask_cors import CORS
import os
import uuid
import datetime
import json
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

app = Flask(__name__)
# Enable CORS for all routes and all origins (for development)
CORS(app, resources={r"/*": {"origins": "*", "supports_credentials": True}})

# Setup JWT
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-in-production'  # Change this in production!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = datetime.timedelta(days=1)
jwt = JWTManager(app)

# User database (in-memory for demo, use a real database in production)
USERS_FILE = "users.json"
HISTORY_FILE = "scan_history.json"

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

def load_history():
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'r') as f:
            return json.load(f)
    return {}
def save_history(history):
    with open(HISTORY_FILE, 'w') as f:
        json.dump(history, f)

# Initialize user database if it doesn't exist
if not os.path.exists(USERS_FILE):
    save_users({})

# Initialize scan history if it doesn't exist
if not os.path.exists(HISTORY_FILE):
    save_history({})

# Load dataset and train model
dataset_path = "dataset.csv"
if not os.path.exists(dataset_path):
    raise FileNotFoundError(f"Dataset file '{dataset_path}' not found.")

df = pd.read_csv(dataset_path)
if "Spam/Ham" not in df.columns or "Subject" not in df.columns or "Message" not in df.columns:
    raise ValueError("Dataset must contain 'Spam/Ham', 'Subject', and 'Message' columns.")

df['label'] = df['Spam/Ham'].map({'spam': 1, 'ham': 0})
if df['label'].isnull().any():
    raise ValueError("Unexpected values in 'Spam/Ham' column. Only 'spam' and 'ham' are allowed.")

df['text'] = df['Subject'].fillna('') + ' ' + df['Message'].fillna('')

pipeline = Pipeline([
    ('tfidf', TfidfVectorizer(stop_words='english')),
    ('clf', MultinomialNB())
])
pipeline.fit(df['text'], df['label'])

# Save model
model_path = "spam_model.pkl"
if not os.path.exists(model_path):  # Save only if the model doesn't already exist
    joblib.dump(pipeline, model_path)


@app.route("/register", methods=["POST", "OPTIONS"])
def register():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    
    if not username or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400
    
    users = load_users()
    
    # Check if user already exists
    for user_id, user in users.items():
        if user["email"] == email:
            return jsonify({"error": "Email already registered"}), 400
        if user["username"] == username:
            return jsonify({"error": "Username already taken"}), 400
    
    # Create new user
    user_id = str(uuid.uuid4())
    users[user_id] = {
        "id": user_id,
        "username": username,
        "email": email,
        "password": generate_password_hash(password),
        "created_at": datetime.datetime.now().isoformat(),
        "settings": {
            "theme": "system",
            "notifications": True
        }
    }
    
    save_users(users)
    
    # Create empty history for the user
    history = load_history()
    history[user_id] = []
    save_history(history)
    
    # Generate token
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "user": {
            "id": user_id,
            "username": username,
            "email": email
        }
    }), 201


@app.route("/login", methods=["POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    
    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400
    
    users = load_users()
    
    # Find user by email
    user_id = None
    user = None
    for uid, u in users.items():
        if u["email"] == email:
            user_id = uid
            user = u
            break
    
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    # Generate token
    access_token = create_access_token(identity=user_id)
    
    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user_id,
            "username": user["username"],
            "email": user["email"]
        }
    })


@app.route("/user", methods=["GET", "OPTIONS"])
@jwt_required()
def get_user():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    users = load_users()
    
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    
    user = users[user_id]
    
    return jsonify({
        "id": user_id,
        "username": user["username"],
        "email": user["email"],
        "settings": user.get("settings", {
            "theme": "system",
            "notifications": True
        })
    })


@app.route("/user/settings", methods=["PUT", "OPTIONS"])
@jwt_required()
def update_settings():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    data = request.get_json()
    settings = data.get("settings")
    
    if not settings:
        return jsonify({"error": "No settings provided"}), 400
    
    users = load_users()
    
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    
    # Update settings
    users[user_id]["settings"] = settings
    save_users(users)
    
    return jsonify({
        "message": "Settings updated successfully",
        "settings": settings
    })


@app.route("/predict", methods=["POST", "OPTIONS"])
@jwt_required()
def predict():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    data = request.get_json()
    messages = data.get("messages")  # Expecting a list of messages
    if not messages or not isinstance(messages, list):
        return jsonify({"error": "No messages provided or invalid format"}), 400

    model = joblib.load(model_path)
    predictions = model.predict(messages)
    probabilities = model.predict_proba(messages)

    results = []
    for i, prediction in enumerate(predictions):
        proba = probabilities[i][prediction]
        result = {
            "message": messages[i][:100] + "..." if len(messages[i]) > 100 else messages[i],  # Truncate for storage
            "prediction": "spam" if prediction == 1 else "ham",
            "confidence": round(proba * 100, 2),
            "timestamp": datetime.datetime.now().isoformat()
        }
        results.append(result)
        
        # Save to user's history
        history = load_history()
        if user_id not in history:
            history[user_id] = []
        
        # Add to history with full message
        history_entry = result.copy()
        history_entry["message"] = messages[i]  # Store full message
        history_entry["id"] = str(uuid.uuid4())  # Add unique ID
        
        # Get word influence for this prediction
        word_influence = get_word_influence_for_message(messages[i], model)
        history_entry["word_influence"] = word_influence
        
        history[user_id].insert(0, history_entry)  # Add to beginning (most recent first)
        
        # Keep only the last 50 entries
        if len(history[user_id]) > 50:
            history[user_id] = history[user_id][:50]
        
        save_history(history)

    return jsonify({"predictions": results})


@app.route("/history", methods=["GET", "OPTIONS"])
@jwt_required()
def get_history():
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    history = load_history()
    
    if user_id not in history:
        return jsonify({"history": []})
    
    # Return the user's history
    return jsonify({"history": history[user_id]})


@app.route("/history/<scan_id>", methods=["GET", "OPTIONS"])
@jwt_required()
def get_scan_details(scan_id):
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    user_id = get_jwt_identity()
    history = load_history()
    
    if user_id not in history:
        return jsonify({"error": "No history found"}), 404
    
    # Find the specific scan
    scan = None
    for entry in history[user_id]:
        if entry["id"] == scan_id:
            scan = entry
            break
    
    if not scan:
        return jsonify({"error": "Scan not found"}), 404
    
    return jsonify({"scan": scan})


@app.route("/", methods=["GET", "OPTIONS"])
def home():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    return jsonify({"status": "ok", "message": "Flask server is running!"})


def get_word_influence_for_message(message, model):
    """Analyze which words in the message most influenced the prediction"""
    # Extract the vectorizer and classifier from the pipeline
    vectorizer = model.named_steps['tfidf']
    classifier = model.named_steps['clf']
    
    # Transform the message to get its feature vector
    X = vectorizer.transform([message])
    
    # Get the feature names
    feature_names = vectorizer.get_feature_names_out()
    
    # Get the coefficients for spam class (class 1)
    coef = classifier.feature_log_prob_[1] - classifier.feature_log_prob_[0]
    
    # Get the non-zero features in the message
    non_zero = X.nonzero()[1]
    
    # Create a list of (word, coefficient) tuples for words in the message
    word_influence = []
    for idx in non_zero:
        word = feature_names[idx]
        influence = coef[idx]
        word_influence.append({"word": word, "influence": float(influence)})
    
    # Sort by absolute influence
    word_influence.sort(key=lambda x: abs(x["influence"]), reverse=True)
    
    # Return top 20 most influential words
    return word_influence[:20]


@app.route("/word-stats", methods=["GET", "OPTIONS"])
def word_stats():
    """Return the most influential words for spam detection"""
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response
        
    model = joblib.load(model_path)
    
    # Extract the TF-IDF vectorizer and classifier from the pipeline
    vectorizer = model.named_steps['tfidf']
    classifier = model.named_steps['clf']
    
    # Get feature names from the vectorizer
    feature_names = vectorizer.get_feature_names_out()
    
    # Get coefficients from the classifier (for Naive Bayes, we use the log probabilities)
    coef = classifier.feature_log_prob_[1] - classifier.feature_log_prob_[0]
    
    # Create a list of (word, coefficient) tuples
    word_coef = list(zip(feature_names, coef))
    
    # Sort by coefficient (higher = more indicative of spam)
    word_coef.sort(key=lambda x: x[1], reverse=True)
    
    # Get top 50 words for spam
    top_spam = [{"word": word, "weight": float(weight)} for word, weight in word_coef[:50]]
    
    # Get top 50 words for ham (non-spam)
    word_coef.sort(key=lambda x: x[1])
    top_ham = [{"word": word, "weight": float(abs(weight))} for word, weight in word_coef[:50]]
    
    return jsonify({
        "spam_words": top_spam,
        "ham_words": top_ham
    })


# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response


if __name__ == "__main__":
    print("Starting Flask server for Spam Detection API...")
    print(f"Dataset loaded with {len(df)} entries")
    print("API endpoints:")
    print("  - GET  / : Health check")
    print("  - POST /register : Register a new user")
    print("  - POST /login : Login a user")
    print("  - GET  /user : Get user details (requires auth)")
    print("  - PUT  /user/settings : Update user settings (requires auth)")
    print("  - POST /predict : Analyze messages for spam (requires auth)")
    print("  - GET  /history : Get user's scan history (requires auth)")
    print("  - GET  /history/<scan_id> : Get details of a specific scan (requires auth)")
    print("  - GET  /word-stats : Get influential words for spam detection")
    print("\nServer running at http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)