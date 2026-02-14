from flask import Flask, jsonify, request, render_template, send_from_directory
from datetime import datetime
import csv, os, json
from flask_cors import CORS
app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)
DATA_DIR = os.path.join(os.getcwd(), 'data')
os.makedirs(DATA_DIR, exist_ok=True)
STATE = {'focused': True, 'last_updated': None, 'detail': 'Focused'}
LAST_USER_FILE = os.path.join(DATA_DIR, 'last_user.txt')
def user_file(username):
    safe = username.replace('/', '_') if username else 'default'
    return os.path.join(DATA_DIR, f'{safe}_events.csv')
def log_event(username, event_type, info=''):
    fname = user_file(username)
    ts = datetime.now().isoformat()
    header = not os.path.exists(fname)
    with open(fname, 'a', newline='') as f:
        writer = csv.writer(f)
        if header:
            writer.writerow(['timestamp','event','info'])
        writer.writerow([ts,event_type,info])
    try:
        with open(LAST_USER_FILE,'w') as lf:
            lf.write(username)
    except:
        pass
@app.route('/')
def index():
    return render_template('index.html')
@app.route('/status', methods=['GET'])
def status():
    return jsonify(STATE)
@app.route('/update', methods=['POST'])
def update():
    data = request.get_json() or {}
    event = data.get('event')
    username = data.get('username','default_user')

    if not event:
        event = 'focused' if data.get('focused', True) else 'eyes_away'

    # Update STATE for dashboard
    if event == 'focused':
        STATE['focused'] = True
        STATE['detail'] = 'Focused'
    elif event == 'eyes_away':
        STATE['focused'] = False
        STATE['detail'] = 'Distracted - Eyes Away'
    elif event == 'face_not_detected':
        STATE['focused'] = False
        STATE['detail'] = 'Face Not Detected'
    else:
        STATE['focused'] = False
        STATE['detail'] = event.replace('_',' ').title()

    STATE['last_updated'] = datetime.now().isoformat()

    # Log every event in CSV — critical
    log_event(username, event, '')

    print(f'[Gaze] Logged {event} for {username}')  # <-- DEBUG

    return jsonify({'ok': True})


@app.route('/log_tab', methods=['POST'])
def log_tab():
    data = request.get_json() or {}
    username = data.get('username','default_user')
    url = data.get('url','')
    event = data.get('event','tab_switch')
    focus_domains = data.get('focus_domains', [])
    if isinstance(focus_domains, str):
        focus_domains = [d.strip() for d in focus_domains.split(',') if d.strip()]
    is_focused = False
    for d in focus_domains:
        if d and d in url:
            is_focused = True
            break
    if is_focused:
        event = 'focused'
    log_event(username, event, url)
    STATE['focused'] = (event == 'focused')
    if event == 'focused':
        STATE['detail'] = f'Focused - Tab ({url})'
    else:
        STATE['detail'] = f'Distracted - Tab Switch ({url})'
    STATE['last_updated'] = datetime.now().isoformat()
    return jsonify({'ok':True})
@app.route('/events/<username>', methods=['GET'])
def get_events(username):
    fname = user_file(username)
    if os.path.exists(fname):
        return send_from_directory(os.path.dirname(fname), os.path.basename(fname), as_attachment=True)
    else:
        return ('No events yet for user', 404)
@app.route('/download_all/<username>', methods=['GET'])
def download_all(username):
    return get_events(username)
@app.route('/clear/<username>', methods=['POST'])
def clear_user(username):
    fname = user_file(username)
    if os.path.exists(fname):
        os.remove(fname)
        return jsonify({'ok': True})
    return jsonify({'ok': False, 'error': 'No file'})
@app.route('/last_user', methods=['GET'])
def last_user():
    if os.path.exists(LAST_USER_FILE):
        with open(LAST_USER_FILE,'r') as f:
            u = f.read().strip()
            return jsonify({'username': u})
    return jsonify({'username': ''})
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)
