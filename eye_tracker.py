import cv2
import mediapipe as mp
import time
import requests
import sys
from datetime import datetime

SERVER_UPDATE_URL = 'http://127.0.0.1:5000/update'
EYE_CLOSED_THRESHOLD = 0.013
LOST_FOCUS_SECONDS = 3.0

USERNAME = sys.argv[1] if len(sys.argv) > 1 else 'default_user'

def post(event):
    try:
        r = requests.post(SERVER_UPDATE_URL, json={'event': event, 'username': USERNAME}, timeout=1)
        print(f'[Gaze] POST {event} -> {r.status_code} {r.text}')
    except Exception as e:
        print(f'[Gaze] POST {event} FAILED: {e}')

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True, max_num_faces=1)

cap = cv2.VideoCapture(0)
lost_start = None
currently_focused = True  # true =  focused
print('Starting Gaze eye-tracker. Press q to quit.')

while True:
    success, frame = cap.read()
    if not success:
        print('No camera frame')
        break

    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(frame_rgb)
    now = time.time()
    display_text = 'No face detected'

    if results.multi_face_landmarks:
        lm = results.multi_face_landmarks[0].landmark
        left_dist = abs(lm[159].y - lm[145].y)
        right_dist = abs(lm[386].y - lm[374].y)
        eyelid = (left_dist + right_dist) / 2.0
        display_text = f'eyelid={eyelid:.4f}'

        if eyelid < EYE_CLOSED_THRESHOLD:
            lost_start = lost_start or now
            elapsed = now - lost_start
            display_text = f'Possibly distracted ({elapsed:.1f}s)'

            if elapsed >= LOST_FOCUS_SECONDS and currently_focused:
                #  log once per eyes-away event
                currently_focused = False
                print(f'[Gaze] Eyes away: {datetime.now().isoformat()}')
                post('eyes_away')

        else:
            lost_start = None
            if not currently_focused:
                currently_focused = True
                print(f'[Gaze] Refocused: {datetime.now().isoformat()}')
                post('focused')

    else:
        # face not detected
        display_text = 'No face detected'
        if currently_focused:
            currently_focused = False
            print(f'[Gaze] Face not detected: {datetime.now().isoformat()}')
            post('face_not_detected')

    cv2.putText(frame, display_text, (20,30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)
    cv2.imshow('Gaze - Eye Tracker', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
