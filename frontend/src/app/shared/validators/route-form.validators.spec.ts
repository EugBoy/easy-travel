import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  arrivalBeforeDepartureValidator,
  citySelectedValidator,
  segmentSequenceValidator,
} from './route-form.validators';

function makeSegmentGroup(overrides: Partial<{ lat: number | null; lng: number | null; arrivalDate: string; departureDate: string }> = {}): FormGroup {
  return new FormGroup({
    city: new FormControl(overrides['lat'] != null ? 'City' : ''),
    lat: new FormControl(overrides.lat ?? null),
    lng: new FormControl(overrides.lng ?? null),
    arrivalDate: new FormControl(overrides.arrivalDate ?? ''),
    departureDate: new FormControl(overrides.departureDate ?? ''),
  });
}

describe('citySelectedValidator', () => {
  it('fails when lat/lng are not set', () => {
    expect(citySelectedValidator(makeSegmentGroup())).toEqual({ citySelected: true });
  });

  it('passes once lat/lng are set', () => {
    expect(citySelectedValidator(makeSegmentGroup({ lat: 1, lng: 2 }))).toBeNull();
  });
});

describe('arrivalBeforeDepartureValidator', () => {
  it('fails when arrival is after departure', () => {
    const group = makeSegmentGroup({ arrivalDate: '2026-08-05', departureDate: '2026-08-01' });
    expect(arrivalBeforeDepartureValidator(group)).toEqual({ arrivalAfterDeparture: true });
  });

  it('passes when arrival is before or equal to departure', () => {
    const group = makeSegmentGroup({ arrivalDate: '2026-08-01', departureDate: '2026-08-01' });
    expect(arrivalBeforeDepartureValidator(group)).toBeNull();
  });
});

describe('segmentSequenceValidator', () => {
  it('fails when the next segment arrives before the previous one departs', () => {
    const array = new FormArray([
      makeSegmentGroup({ arrivalDate: '2026-08-01', departureDate: '2026-08-05' }),
      makeSegmentGroup({ arrivalDate: '2026-08-03', departureDate: '2026-08-06' }),
    ]);
    expect(segmentSequenceValidator(array)).toEqual({ sequenceBroken: 1 });
  });

  it('passes for a properly ordered sequence', () => {
    const array = new FormArray([
      makeSegmentGroup({ arrivalDate: '2026-08-01', departureDate: '2026-08-05' }),
      makeSegmentGroup({ arrivalDate: '2026-08-05', departureDate: '2026-08-08' }),
    ]);
    expect(segmentSequenceValidator(array)).toBeNull();
  });
});
