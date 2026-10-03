"""Position arrays stay compatible with the original single primary field."""

from models import Player, PlayerCreate


def test_legacy_primary_position_migrates_without_loss():
    player = Player(
        id="p1",
        name="Maya Chen",
        primary_position="SS",
        secondary_positions=["2B", "SS"],
        bats="R",
        throws="R",
    )

    assert player.primary_position == "SS"
    assert player.primary_positions == ["SS"]
    assert player.secondary_positions == ["2B"]


def test_multiple_primaries_round_trip_and_set_legacy_field():
    created = PlayerCreate(
        name="Luis Ortega",
        primary_positions=["CF", "RF"],
        secondary_positions=["LF"],
        bats="L",
        throws="L",
    )
    stored = Player(id="p2", **created.model_dump())

    assert stored.primary_positions == ["CF", "RF"]
    assert stored.primary_position == "CF"
    assert stored.secondary_positions == ["LF"]
    dumped = stored.model_dump()
    assert dumped["primary_position"] == "CF"
    assert dumped["primary_positions"] == ["CF", "RF"]


def test_one_primary_is_enough_and_secondary_may_be_empty():
    created = PlayerCreate(
        name="Ava Brooks",
        primary_position="C",
        bats="R",
        throws="R",
    )
    assert created.primary_positions == ["C"]
    assert created.secondary_positions == []
