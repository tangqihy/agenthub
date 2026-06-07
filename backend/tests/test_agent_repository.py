"""Contract tests for Agent Registry repository layer."""

import pytest
import pytest_asyncio
from app.models.domain import Agent, AgentVersion, AgentRun, ChatMessage


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_agent(**overrides):
    defaults = dict(
        id="agent-1",
        name="Test Agent",
        description="A test agent",
        avatar="🧪",
        runtime="hermes",
        publish_scope="private",
        current_version=1,
        created_at=1000,
        updated_at=1000,
    )
    defaults.update(overrides)
    return Agent(**defaults)


def _make_version(**overrides):
    defaults = dict(
        id="ver-1",
        agent_id="agent-1",
        version=1,
        config_json={"model": "gpt-4", "prompt": "hello"},
        created_at=1000,
    )
    defaults.update(overrides)
    return AgentVersion(**defaults)


def _make_run(**overrides):
    defaults = dict(
        id="run-1",
        agent_id="agent-1",
        runtime="hermes",
        runtime_session_id=None,
        status="completed",
        started_at=1000,
        ended_at=2000,
    )
    defaults.update(overrides)
    return AgentRun(**defaults)


# ── 1. Agent CRUD ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_crud(storage):
    """Create, get, list, update, delete an agent."""
    agent = _make_agent()

    # create
    await storage.create_agent(agent)

    # get
    fetched = await storage.get_agent("agent-1")
    assert fetched is not None
    assert fetched.id == "agent-1"
    assert fetched.name == "Test Agent"
    assert fetched.description == "A test agent"
    assert fetched.avatar == "🧪"
    assert fetched.runtime == "hermes"
    assert fetched.publish_scope == "private"
    assert fetched.current_version == 1

    # list
    agents = await storage.list_agents()
    assert len(agents) == 1
    assert agents[0].id == "agent-1"

    # get non-existent returns None
    assert await storage.get_agent("nonexistent") is None

    # update
    agent.name = "Updated Agent"
    agent.description = "Updated description"
    agent.avatar = "🚀"
    agent.current_version = 2
    agent.updated_at = 9999
    await storage.update_agent(agent)

    updated = await storage.get_agent("agent-1")
    assert updated.name == "Updated Agent"
    assert updated.description == "Updated description"
    assert updated.avatar == "🚀"
    assert updated.current_version == 2
    assert updated.updated_at == 9999

    # delete
    await storage.delete_agent("agent-1")
    assert await storage.get_agent("agent-1") is None
    agents = await storage.list_agents()
    assert len(agents) == 0


# ── 2. Agent list filter ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_list_filter(storage):
    """Filter agents by runtime, scope, and search query."""
    await storage.create_agent(_make_agent(id="a1", name="Alpha Bot", runtime="hermes", publish_scope="private"))
    await storage.create_agent(_make_agent(id="a2", name="Beta Bot", runtime="langchain", publish_scope="private"))
    await storage.create_agent(_make_agent(id="a3", name="Gamma Bot", runtime="hermes", publish_scope="public"))
    await storage.create_agent(_make_agent(id="a4", name="Delta Worker", runtime="hermes", publish_scope="public"))

    # filter by runtime
    hermes_agents = await storage.list_agents(runtime="hermes")
    assert len(hermes_agents) == 3
    assert all(a.runtime == "hermes" for a in hermes_agents)

    langchain_agents = await storage.list_agents(runtime="langchain")
    assert len(langchain_agents) == 1
    assert langchain_agents[0].id == "a2"

    # filter by scope
    public_agents = await storage.list_agents(scope="public")
    assert len(public_agents) == 2
    assert all(a.publish_scope == "public" for a in public_agents)

    # filter by search query
    bot_agents = await storage.list_agents(q="Bot")
    assert len(bot_agents) == 3

    worker_agents = await storage.list_agents(q="Worker")
    assert len(worker_agents) == 1
    assert worker_agents[0].id == "a4"

    # combined filters
    filtered = await storage.list_agents(runtime="hermes", scope="public", q="Gamma")
    assert len(filtered) == 1
    assert filtered[0].id == "a3"

    # no results
    empty = await storage.list_agents(q="Nonexistent")
    assert len(empty) == 0


# ── 3. Agent version increment ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_version_increment(storage):
    """Create multiple versions and verify ordering (descending)."""
    await storage.create_agent(_make_agent())

    for v_num in range(1, 4):
        await storage.create_agent_version(
            _make_version(id=f"ver-{v_num}", version=v_num, config_json={"v": v_num})
        )

    versions = await storage.list_agent_versions("agent-1")
    assert len(versions) == 3
    # list_agent_versions orders by version DESC
    assert [v.version for v in versions] == [3, 2, 1]
    # verify config_json round-trips
    assert versions[0].config_json == {"v": 3}
    assert versions[2].config_json == {"v": 1}


# ── 4. Agent version get by number ───────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_version_get(storage):
    """Get a specific version by (agent_id, version) pair."""
    await storage.create_agent(_make_agent())

    await storage.create_agent_version(
        _make_version(id="ver-1", version=1, config_json={"model": "gpt-4"})
    )
    await storage.create_agent_version(
        _make_version(id="ver-2", version=2, config_json={"model": "gpt-4o"})
    )

    # fetch specific version
    v1 = await storage.get_agent_version("agent-1", 1)
    assert v1 is not None
    assert v1.version == 1
    assert v1.config_json == {"model": "gpt-4"}

    v2 = await storage.get_agent_version("agent-1", 2)
    assert v2 is not None
    assert v2.version == 2
    assert v2.config_json == {"model": "gpt-4o"}

    # non-existent version
    assert await storage.get_agent_version("agent-1", 99) is None
    # wrong agent
    assert await storage.get_agent_version("nonexistent", 1) is None


# ── 5. Agent delete cascade ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_delete_cascade(storage):
    """Deleting an agent should cascade-delete its versions and runs."""
    await storage.create_agent(_make_agent())
    await storage.create_agent_version(_make_version(id="ver-1", version=1))
    await storage.create_agent_version(_make_version(id="ver-2", version=2))
    await storage.create_agent_run(_make_run(id="run-1"))
    await storage.create_agent_run(_make_run(id="run-2"))

    # pre-check: data exists
    assert len(await storage.list_agent_versions("agent-1")) == 2
    assert len(await storage.list_agent_runs("agent-1")) == 2

    # delete
    await storage.delete_agent("agent-1")

    # agent is gone
    assert await storage.get_agent("agent-1") is None

    # versions are gone (cascade)
    assert len(await storage.list_agent_versions("agent-1")) == 0

    # runs are gone (cascade)
    assert len(await storage.list_agent_runs("agent-1")) == 0


# ── 6. Agent run create and list ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_run_create_and_list(storage):
    """Create multiple runs and verify listing with limit."""
    await storage.create_agent(_make_agent())

    for i in range(1, 6):
        await storage.create_agent_run(
            _make_run(
                id=f"run-{i}",
                status="completed" if i % 2 == 0 else "failed",
                started_at=1000 + i,
                ended_at=2000 + i if i % 2 == 0 else None,
                runtime_session_id=f"sess-{i}" if i % 2 == 1 else None,
            )
        )

    # default limit = 20 → all 5 returned
    runs = await storage.list_agent_runs("agent-1")
    assert len(runs) == 5
    # ordered by started_at DESC
    assert runs[0].started_at == 1005
    assert runs[-1].started_at == 1001

    # explicit limit
    runs_limited = await storage.list_agent_runs("agent-1", limit=2)
    assert len(runs_limited) == 2

    # verify run fields round-trip
    run_with_session = next(r for r in runs if r.runtime_session_id is not None)
    assert run_with_session.runtime_session_id.startswith("sess-")

    run_no_end = next(r for r in runs if r.ended_at is None)
    assert run_no_end.status == "failed"

    # non-existent agent → empty list
    assert len(await storage.list_agent_runs("nonexistent")) == 0


# ── 7. Agent clone workflow ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_clone_workflow(storage):
    """Clone an agent: create source with version, clone into new agent, verify config matches."""
    # Create source agent with version 1 and version 2
    await storage.create_agent(
        _make_agent(id="src", name="Source Agent", current_version=2, created_at=100, updated_at=200)
    )
    config_v1 = {"model": "gpt-4", "system_prompt": "You are helpful"}
    config_v2 = {"model": "gpt-4o", "system_prompt": "You are helpful", "tools": ["web_search"]}
    await storage.create_agent_version(_make_version(id="sv-1", agent_id="src", version=1, config_json=config_v1))
    await storage.create_agent_version(_make_version(id="sv-2", agent_id="src", version=2, config_json=config_v2))

    # "Clone" = create a new agent row + copy the latest version config
    latest = await storage.get_agent_version("src", 2)
    assert latest is not None

    cloned_agent = _make_agent(
        id="clone-1",
        name="Source Agent (clone)",
        current_version=1,
        created_at=300,
        updated_at=300,
    )
    await storage.create_agent(cloned_agent)

    cloned_version = AgentVersion(
        id="cv-1",
        agent_id="clone-1",
        version=1,
        config_json=latest.config_json,
        created_at=300,
    )
    await storage.create_agent_version(cloned_version)

    # Verify cloned agent
    fetched = await storage.get_agent("clone-1")
    assert fetched is not None
    assert fetched.name == "Source Agent (clone)"
    assert fetched.id != "src"

    # Verify cloned version has same config
    cv = await storage.get_agent_version("clone-1", 1)
    assert cv is not None
    assert cv.config_json == config_v2

    # Verify source agent is unchanged
    src_versions = await storage.list_agent_versions("src")
    assert len(src_versions) == 2

    # Verify deleting clone does not affect source
    await storage.delete_agent("clone-1")
    assert await storage.get_agent("src") is not None
    assert len(await storage.list_agent_versions("src")) == 2


# ── 8. V2.1: Agent usage tracking ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_usage_tracking(storage):
    """Verify usage_count increments on each increment call."""
    agent = _make_agent(usage_count=0, last_used_at=None)
    await storage.create_agent(agent)

    # Initial state
    fetched = await storage.get_agent("agent-1")
    assert fetched.usage_count == 0
    assert fetched.last_used_at is None

    # First increment
    await storage.increment_agent_usage("agent-1")
    fetched = await storage.get_agent("agent-1")
    assert fetched.usage_count == 1
    assert fetched.last_used_at is not None
    first_used_at = fetched.last_used_at

    # Second increment
    await storage.increment_agent_usage("agent-1")
    fetched = await storage.get_agent("agent-1")
    assert fetched.usage_count == 2
    assert fetched.last_used_at >= first_used_at

    # Non-existent agent should not error (no-op)
    await storage.increment_agent_usage("nonexistent")


# ── 9. V2.1: Agent from-session ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_from_session(storage):
    """Create an agent from a session and verify source_session_id is set."""
    from app.models.domain import Session

    # Create a session first
    session = Session(
        id="sess-test-1",
        external_id="ext-1",
        title="My Test Session",
        source="hermes",
        started_at=1000,
        is_active=True,
    )
    await storage.upsert_sessions([session])

    # Simulate creating an agent from session (as the router does)
    agent = _make_agent(
        id="from-sess-1",
        name=session.title,
        description=f"从 Session「{session.title}」创建",
        source_session_id=session.id,
    )
    await storage.create_agent(agent)

    fetched = await storage.get_agent("from-sess-1")
    assert fetched is not None
    assert fetched.name == "My Test Session"
    assert "My Test Session" in fetched.description
    assert fetched.source_session_id == "sess-test-1"


# ── 10. V2.1: Agent catalog sort ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_catalog_sort(storage):
    """Verify catalog returns agents sorted by chosen field."""
    # Create agents with different timestamps and usage counts
    await storage.create_agent(
        _make_agent(id="a1", name="Old Agent", created_at=100, updated_at=300, usage_count=5)
    )
    await storage.create_agent(
        _make_agent(id="a2", name="New Agent", created_at=300, updated_at=100, usage_count=1)
    )
    await storage.create_agent(
        _make_agent(id="a3", name="Popular Agent", created_at=200, updated_at=200, usage_count=10)
    )

    # Sort by recent (created_at DESC)
    recent = await storage.list_agents_catalog(sort="recent")
    assert len(recent) == 3
    assert [a.id for a in recent] == ["a2", "a3", "a1"]

    # Sort by updated (updated_at DESC)
    updated = await storage.list_agents_catalog(sort="updated")
    assert len(updated) == 3
    assert [a.id for a in updated] == ["a1", "a3", "a2"]

    # Sort by usage (usage_count DESC)
    usage = await storage.list_agents_catalog(sort="usage")
    assert len(usage) == 3
    assert [a.id for a in usage] == ["a3", "a1", "a2"]

    # Default sort is recent
    default_sort = await storage.list_agents_catalog()
    assert [a.id for a in default_sort] == ["a2", "a3", "a1"]


# ── 11. V2.1: Agent tree (parent/children) ───────────────────────────────────

@pytest.mark.asyncio
async def test_agent_tree(storage):
    """Verify parent/children derivation tree relationships."""
    # Create parent agent
    parent = _make_agent(id="parent-1", name="Parent Agent")
    await storage.create_agent(parent)

    # Create children agents that derive from parent
    child1 = _make_agent(
        id="child-1", name="Child 1", derived_from_agent_id="parent-1", created_at=2000
    )
    child2 = _make_agent(
        id="child-2", name="Child 2", derived_from_agent_id="parent-1", created_at=3000
    )
    await storage.create_agent(child1)
    await storage.create_agent(child2)

    # Create an unrelated agent
    unrelated = _make_agent(id="other-1", name="Unrelated")
    await storage.create_agent(unrelated)

    # Verify children
    children = await storage.get_child_agents("parent-1")
    assert len(children) == 2
    child_ids = [c.id for c in children]
    assert "child-1" in child_ids
    assert "child-2" in child_ids

    # Verify parent reference on child
    fetched_child = await storage.get_agent("child-1")
    assert fetched_child.derived_from_agent_id == "parent-1"

    # Verify unrelated agent has no parent
    fetched_other = await storage.get_agent("other-1")
    assert fetched_other.derived_from_agent_id is None

    # Verify unrelated agent has no children
    assert len(await storage.get_child_agents("other-1")) == 0

    # Verify non-existent agent has no children
    assert len(await storage.get_child_agents("nonexistent")) == 0


# ── 12. V2.1: New fields round-trip ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_agent_new_fields_roundtrip(storage):
    """Verify all V2.1 fields survive database round-trip."""
    agent = _make_agent(
        notes="Some important notes",
        use_cases="Code review, writing",
        caveats="Does not handle images",
        source_session_id="sess-abc",
        derived_from_agent_id="parent-xyz",
        usage_count=42,
        last_used_at=5000,
    )
    await storage.create_agent(agent)

    fetched = await storage.get_agent("agent-1")
    assert fetched.notes == "Some important notes"
    assert fetched.use_cases == "Code review, writing"
    assert fetched.caveats == "Does not handle images"
    assert fetched.source_session_id == "sess-abc"
    assert fetched.derived_from_agent_id == "parent-xyz"
    assert fetched.usage_count == 42
    assert fetched.last_used_at == 5000


# ── 13. V2.2: Chat message isolation ─────────────────────────────────────────

@pytest.mark.asyncio
async def test_chat_messages_are_isolated_by_agent(storage):
    """The same conversation_id must not leak messages across agents."""
    await storage.create_chat_message(
        ChatMessage(
            id="msg-a1",
            agent_id="agent-a",
            conversation_id="conv-shared",
            role="user",
            content="message for agent a",
            created_at=1000,
            metadata={"source": "test"},
        )
    )
    await storage.create_chat_message(
        ChatMessage(
            id="msg-b1",
            agent_id="agent-b",
            conversation_id="conv-shared",
            role="user",
            content="message for agent b",
            created_at=1001,
        )
    )

    agent_a_messages = await storage.list_chat_messages("agent-a", "conv-shared")
    agent_b_messages = await storage.list_chat_messages("agent-b", "conv-shared")

    assert [m.content for m in agent_a_messages] == ["message for agent a"]
    assert [m.content for m in agent_b_messages] == ["message for agent b"]
    assert agent_a_messages[0].status == "completed"
    assert agent_a_messages[0].metadata == {"source": "test"}
