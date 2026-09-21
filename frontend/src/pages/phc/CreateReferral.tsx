import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { referralApi } from '../../services/api';
import { Activity, User as UserIcon, Heart, Thermometer, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';

export const CreateReferral: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [patientName, setPatientName] = useState('Rajesh Kumar');
  const [age, setAge] = useState(54);
  const [gender, setGender] = useState('Male');
  const [contactNumber, setContactNumber] = useState('+91 98230 44112');
  const [symptoms, setSymptoms] = useState('Patient has severe acute breathing difficulty, oxygen saturation 82%, gasping, respiratory distress.');
  const [spo2, setSpo2] = useState<number | ''>(82);
  const [heartRate, setHeartRate] = useState<number | ''>(118);
  const [bp, setBp] = useState('90/60');
  const [notes, setNotes] = useState('Patient stabilized with temporary oxygen at PHC. Urgent tertiary care transfer required.');

  const handlePresetFill = () => {
    setPatientName('Rajesh Kumar');
    setAge(54);
    setGender('Male');
    setSymptoms('Patient has severe acute breathing difficulty, oxygen saturation 82%, gasping, respiratory distress.');
    setSpo2(82);
    setHeartRate(118);
    setBp('90/60');
  };

  const handleClearForm = () => {
    setPatientName('');
    setAge(0);
    setGender('Male');
    setContactNumber('');
    setSymptoms('');
    setSpo2('');
    setHeartRate('');
    setBp('');
    setNotes('');
  };

  const getLiveExtractedResources = () => {
    const textLower = symptoms.toLowerCase();
    const numSpo2 = typeof spo2 === 'number' ? spo2 : null;

    if (!symptoms.trim() && numSpo2 === null) {
      return [];
    }

    const resources: { label: string; color: string }[] = [];

    // Emergency Physician (Always required for emergency intake)
    resources.push({ label: 'Emergency Physician', color: 'bg-slate-700' });

    // Respiratory / Oxygen / Ventilator
    if (textLower.includes('breath') || textLower.includes('respiratory') || textLower.includes('gasping') || textLower.includes('spo2') || (numSpo2 !== null && numSpo2 < 95)) {
      resources.push({ label: 'Oxygen Support', color: 'bg-sky-600' });
    }

    if ((numSpo2 !== null && numSpo2 < 90) || textLower.includes('cardiac') || textLower.includes('stroke') || textLower.includes('trauma') || textLower.includes('unconscious')) {
      resources.push({ label: 'ICU Bed', color: 'bg-rose-600' });
    }

    if ((numSpo2 !== null && numSpo2 < 85) || textLower.includes('gasping') || textLower.includes('respiratory distress')) {
      resources.push({ label: 'Ventilator Ready', color: 'bg-indigo-600' });
    }

    if (textLower.includes('cardiac') || textLower.includes('angina') || textLower.includes('heart')) {
      resources.push({ label: 'Cardiologist Specialist', color: 'bg-purple-600' });
    }

    if (textLower.includes('trauma') || textLower.includes('accident') || textLower.includes('bleeding')) {
      resources.push({ label: 'Trauma Specialist', color: 'bg-amber-600' });
    }

    return resources;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await referralApi.createReferral({
        patient_name: patientName,
        age: Number(age),
        gender,
        contact_number: contactNumber,
        phc_id: 'phc-shirur-01',
        emergency_type: 'Acute Respiratory Distress',
        priority: 'CRITICAL',
        symptoms,
        spo2: spo2 !== '' ? Number(spo2) : null,
        heart_rate: heartRate !== '' ? Number(heartRate) : null,
        blood_pressure: bp,
        notes
      });

      navigate(`/phc/recommendations/${created.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  const extractedResources = getLiveExtractedResources();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create Emergency Patient Referral</h1>
          <p className="text-xs text-slate-500 mt-1">Input patient vitals and symptoms for AI clinical resource extraction.</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClearForm}
            className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border hover:bg-slate-200 transition flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear Form
          </button>
          <button
            type="button"
            onClick={handlePresetFill}
            className="text-xs bg-sky-50 text-sky-700 font-semibold px-3 py-1.5 rounded-lg border border-sky-200 hover:bg-sky-100 transition"
          >
            Autofill 54yo Preset
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
        
        {/* Section 1: Patient Demographics */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-rose-600 border-b pb-2">
            1. Patient Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name</label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years)</label>
              <input
                type="number"
                required
                value={age || ''}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Patient Vitals */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-rose-600 border-b pb-2">
            2. Vitals & Clinical Indicators
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SpO2 (%)</label>
              <input
                type="number"
                value={spo2}
                onChange={(e) => setSpo2(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-rose-600 focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. 82"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Heart Rate (bpm)</label>
              <input
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value !== '' ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. 118"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Pressure (mmHg)</label>
              <input
                type="text"
                value={bp}
                onChange={(e) => setBp(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. 90/60"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Clinical Symptoms & NLP Parser */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-rose-600 border-b pb-2">
            3. Clinical Symptoms & Presentation
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Symptoms Description</label>
            <textarea
              rows={3}
              required
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-sky-500"
              placeholder="Describe breathing difficulty, chest pain, level of consciousness..."
            ></textarea>
          </div>

          <div className="bg-sky-50 p-4 rounded-xl border border-sky-200 space-y-2 text-xs text-sky-900">
            <p className="font-bold flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-sky-600" />
              Modular AI Clinical Extractor Live Preview:
            </p>
            {extractedResources.length === 0 ? (
              <p className="text-slate-500 italic text-[11px] pt-1">
                Type patient symptoms or vitals above to preview real-time AI resource extraction...
              </p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {extractedResources.map((res, idx) => (
                  <span key={idx} className={`px-2.5 py-1 ${res.color} text-white font-bold rounded-md shadow-sm`}>
                    {res.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-rose-600/30 transition flex items-center gap-2"
          >
            {loading ? 'Evaluating Hospitals...' : 'Find Suitable Hospital'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>

      </form>
    </div>
  );
};
