import httpx

r = httpx.post('http://127.0.0.1:8001/api/v1/referrals', json={
    'patient_name': 'Test Patient',
    'age': 54,
    'gender': 'Male',
    'phc_id': 'phc-shirur-01',
    'emergency_type': 'Acute Respiratory Distress',
    'symptoms': 'breathing difficulty',
    'spo2': 82
}).json()

print('CREATED REFERRAL ID:', r['id'])

rec = httpx.post(f"http://127.0.0.1:8001/api/v1/referrals/{r['id']}/recommendations")
print('STATUS CODE:', rec.status_code)
print('RESPONSE TEXT:', rec.text)
