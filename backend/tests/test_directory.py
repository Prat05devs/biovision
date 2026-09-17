import pytest
from fastapi.testclient import TestClient

from app.care.directory import load_directory
from app.main import app


def test_directory_contains_real_provider_sources():
    directory = load_directory()
    assert directory['region'] == 'in-uk-dehradun'
    assert len(directory['facilities']) >= 200
    assert any(f['isGovernment'] for f in directory['facilities'])
    for facility in directory['facilities']:
        assert facility['sourceUrl'].startswith('https://')
        assert facility['verifiedAt']
        assert 'google.com/maps/dir/' in facility['directionsUrl']
        assert 'distanceKm' not in facility


def test_unknown_region_does_not_return_default_city():
    with pytest.raises(LookupError):
        load_directory('../../other-city')
    response = TestClient(app).get('/v1/healthcare/facilities?region=unknown')
    assert response.status_code == 404


def test_directory_api_and_local_snapshot_match():
    response = TestClient(app).get('/v1/healthcare/facilities?region=in-uk-dehradun')
    assert response.status_code == 200
    assert response.json() == load_directory('in-uk-dehradun')
