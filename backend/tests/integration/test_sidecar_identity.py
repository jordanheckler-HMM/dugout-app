import os
import subprocess
import sys

from main import host_process_alive


def test_root_returns_sidecar_instance_id(client, monkeypatch):
    monkeypatch.setenv("DUGOUT_INSTANCE_ID", "dugout-test-instance")

    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["instance_id"] == "dugout-test-instance"


def test_host_process_liveness():
    assert host_process_alive(os.getpid())
    assert not host_process_alive(-1)

    child = subprocess.Popen([sys.executable, "-c", "pass"])
    child.wait(timeout=5)
    assert not host_process_alive(child.pid)
