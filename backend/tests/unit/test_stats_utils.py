import pytest

from main import convert_baseball_ip_to_actual_innings


@pytest.mark.unit
@pytest.mark.parametrize(
    ("ip_notation", "expected"),
    [
        (0.0, 0.0),
        (1.0, 1.0),
        (1.1, 1 + (1 / 3)),
        (1.2, 1 + (2 / 3)),
        (5.1, 5 + (1 / 3)),
    ],
)
def test_convert_baseball_ip_to_actual_innings(ip_notation: float, expected: float):
    assert convert_baseball_ip_to_actual_innings(ip_notation) == pytest.approx(expected)
