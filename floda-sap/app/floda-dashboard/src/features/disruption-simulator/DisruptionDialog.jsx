import { useState } from 'react';
import { X, Play, SlidersHorizontal } from 'lucide-react';
import { Button } from '../../components/ui';
import { flodaApi } from '../../services/flodaApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function DisruptionDialog({ open, onClose }) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    location: 'Mugling-Narayanghat KM-36',
    corridor: 'Birgunj-Kathmandu Arterial Highway',
    chokepoint_type: 'landslide',
    severity: 'critical',
    affected_routes: 'Central Nepal Trans-Himalayan Corridor',
    description: 'Major rockfall blocking both lanes. 14 heavy freight carriers trapped.',
    capacity_reduction_percent: 85,
    expected_duration_hours: 48
  });

  const triggerMutation = useMutation({
    mutationFn: (payload) => flodaApi.triggerDisruption(payload),
    onSuccess: () => {
      toast.success('Disruption sensed! Agentic pipeline executed and scenarios generated in SAP HANA.');
      queryClient.invalidateQueries({ queryKey: ['disruptions'] });
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['chokepoints'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      onClose();
    },
    onError: (error) => toast.error(error.message)
  });

  if (!open) return null;

  const updateField = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    triggerMutation.mutate({
      ...formData,
      capacity_reduction_percent: Number(formData.capacity_reduction_percent),
      expected_duration_hours: Number(formData.expected_duration_hours)
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-header">
            <div className="modal-title-group">
              <span className="modal-icon-badge">
                <SlidersHorizontal size={16} />
              </span>
              <div>
                <h2 className="modal-heading">Trigger Corridor Disruption Scenario</h2>
                <p className="modal-subheading">Simulate live supply chain chokepoint to execute autonomous multi-agent pipeline.</p>
              </div>
            </div>
            <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            <div className="form-grid-two">
              <label className="input-group">
                <span className="input-label">Disruption Location</span>
                <input
                  className="form-input"
                  value={formData.location}
                  onChange={e => updateField('location', e.target.value)}
                  placeholder="e.g. Mugling-Narayanghat KM-36"
                  required
                />
              </label>

              <label className="input-group">
                <span className="input-label">Disruption Type</span>
                <select
                  className="form-select"
                  value={formData.chokepoint_type}
                  onChange={e => updateField('chokepoint_type', e.target.value)}
                >
                  <option value="landslide">Landslide / Rockfall</option>
                  <option value="flood">Flash Flood</option>
                  <option value="road_closure">Road Closure / Bridge Collapse</option>
                  <option value="port_congestion">Port Congestion</option>
                  <option value="weather">Severe Himalayan Weather</option>
                  <option value="other">Other Incident</option>
                </select>
              </label>
            </div>

            <div className="form-grid-two">
              <label className="input-group">
                <span className="input-label">Affected Highway / Corridor</span>
                <input
                  className="form-input"
                  value={formData.corridor}
                  onChange={e => updateField('corridor', e.target.value)}
                  placeholder="e.g. Birgunj-Kathmandu Arterial"
                  required
                />
              </label>

              <label className="input-group">
                <span className="input-label">Impact Severity</span>
                <select
                  className="form-select"
                  value={formData.severity}
                  onChange={e => updateField('severity', e.target.value)}
                >
                  <option value="low">Low Impact</option>
                  <option value="medium">Medium Impact</option>
                  <option value="high">High Impact</option>
                  <option value="critical">Critical Impact</option>
                </select>
              </label>
            </div>

            <label className="input-group">
              <span className="input-label">Incident Description</span>
              <textarea
                className="form-input form-textarea"
                rows="2"
                value={formData.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Details of the obstruction, stranded carriers, or hazards..."
                required
              />
            </label>

            <div className="slider-group">
              <div className="slider-label-row">
                <span className="input-label">Throughput Capacity Reduction</span>
                <strong className="slider-value">{formData.capacity_reduction_percent}%</strong>
              </div>
              <input
                type="range"
                className="form-range"
                min="10"
                max="100"
                value={formData.capacity_reduction_percent}
                onChange={e => updateField('capacity_reduction_percent', e.target.value)}
              />
            </div>

            <label className="input-group">
              <span className="input-label">Estimated Duration (Hours)</span>
              <input
                type="number"
                className="form-input"
                min="1"
                max="720"
                value={formData.expected_duration_hours}
                onChange={e => updateField('expected_duration_hours', e.target.value)}
                required
              />
            </label>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={triggerMutation.isPending}>
              <Play size={14} />
              <span>{triggerMutation.isPending ? 'Sensing & Analyzing...' : 'Trigger Disruption & Run Agents'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
