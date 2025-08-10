"""
Database migration to optimize backlog table performance
"""
from sqlalchemy import text
from sqlalchemy.orm import Session

def upgrade_backlog_table(db: Session):
    """Add optimized columns and indexes to backlog table"""
    
    # Add new columns
    db.execute(text("""
        ALTER TABLE backlogs 
        ADD COLUMN IF NOT EXISTS item_type VARCHAR(50) DEFAULT 'story',
        ADD COLUMN IF NOT EXISTS root_id INTEGER REFERENCES backlogs(backlog_id),
        ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS path VARCHAR(500),
        ADD COLUMN IF NOT EXISTS estimated_hours INTEGER,
        ADD COLUMN IF NOT EXISTS actual_hours INTEGER,
        ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS assigned_to_id INTEGER REFERENCES users(id)
    """))
    
    # Add indexes for better performance
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlogs(status);
        CREATE INDEX IF NOT EXISTS idx_backlog_priority ON backlogs(priority);
        CREATE INDEX IF NOT EXISTS idx_backlog_item_type ON backlogs(item_type);
        CREATE INDEX IF NOT EXISTS idx_backlog_parent_id ON backlogs(parent_id);
        CREATE INDEX IF NOT EXISTS idx_backlog_root_id ON backlogs(root_id);
        CREATE INDEX IF NOT EXISTS idx_backlog_level ON backlogs(level);
        CREATE INDEX IF NOT EXISTS idx_backlog_path ON backlogs(path);
        CREATE INDEX IF NOT EXISTS idx_backlog_story_point ON backlogs(story_point);
        CREATE INDEX IF NOT EXISTS idx_backlog_due_date ON backlogs(due_date);
        CREATE INDEX IF NOT EXISTS idx_backlog_completed_at ON backlogs(completed_at);
        CREATE INDEX IF NOT EXISTS idx_backlog_created_at ON backlogs(created_at);
        CREATE INDEX IF NOT EXISTS idx_backlog_assigned_to_id ON backlogs(assigned_to_id);
    """))
    
    # Add composite indexes for common query patterns
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_backlog_project_status ON backlogs(project_id, status);
        CREATE INDEX IF NOT EXISTS idx_backlog_sprint_status ON backlogs(sprint_id, status);
        CREATE INDEX IF NOT EXISTS idx_backlog_priority_status ON backlogs(priority, status);
        CREATE INDEX IF NOT EXISTS idx_backlog_assignee_status ON backlogs(assigned_to_id, status);
        CREATE INDEX IF NOT EXISTS idx_backlog_type_status ON backlogs(item_type, status);
        CREATE INDEX IF NOT EXISTS idx_backlog_project_priority ON backlogs(project_id, priority);
        CREATE INDEX IF NOT EXISTS idx_backlog_sprint_priority ON backlogs(sprint_id, priority);
        CREATE INDEX IF NOT EXISTS idx_backlog_root_level ON backlogs(root_id, level);
    """))
    
    # Add full-text search index
    db.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_backlog_fts 
        ON backlogs USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));
    """))
    
    # Update existing records to set proper hierarchical data
    db.execute(text("""
        UPDATE backlogs 
        SET level = 0, root_id = backlog_id 
        WHERE parent_id IS NULL;
    """))
    
    # Update path for existing hierarchical items
    db.execute(text("""
        WITH RECURSIVE hierarchy AS (
            SELECT backlog_id, title, parent_id, 0 as level, title as path
            FROM backlogs 
            WHERE parent_id IS NULL
            
            UNION ALL
            
            SELECT b.backlog_id, b.title, b.parent_id, h.level + 1, 
                   h.path || ' > ' || b.title
            FROM backlogs b
            JOIN hierarchy h ON b.parent_id = h.backlog_id
        )
        UPDATE backlogs 
        SET level = h.level, path = h.path, root_id = (
            SELECT root.backlog_id 
            FROM backlogs root 
            WHERE root.backlog_id = (
                SELECT COALESCE(
                    (SELECT parent_id FROM backlogs WHERE backlog_id = backlogs.parent_id),
                    backlogs.backlog_id
                )
            )
        )
        FROM hierarchy h
        WHERE backlogs.backlog_id = h.backlog_id;
    """))
    
    db.commit()

def downgrade_backlog_table(db: Session):
    """Remove optimized columns and indexes from backlog table"""
    
    # Drop indexes
    db.execute(text("""
        DROP INDEX IF EXISTS idx_backlog_status;
        DROP INDEX IF EXISTS idx_backlog_priority;
        DROP INDEX IF EXISTS idx_backlog_item_type;
        DROP INDEX IF EXISTS idx_backlog_parent_id;
        DROP INDEX IF EXISTS idx_backlog_root_id;
        DROP INDEX IF EXISTS idx_backlog_level;
        DROP INDEX IF EXISTS idx_backlog_path;
        DROP INDEX IF EXISTS idx_backlog_story_point;
        DROP INDEX IF EXISTS idx_backlog_due_date;
        DROP INDEX IF EXISTS idx_backlog_completed_at;
        DROP INDEX IF EXISTS idx_backlog_created_at;
        DROP INDEX IF EXISTS idx_backlog_assigned_to_id;
        DROP INDEX IF EXISTS idx_backlog_project_status;
        DROP INDEX IF EXISTS idx_backlog_sprint_status;
        DROP INDEX IF EXISTS idx_backlog_priority_status;
        DROP INDEX IF EXISTS idx_backlog_assignee_status;
        DROP INDEX IF EXISTS idx_backlog_type_status;
        DROP INDEX IF EXISTS idx_backlog_project_priority;
        DROP INDEX IF EXISTS idx_backlog_sprint_priority;
        DROP INDEX IF EXISTS idx_backlog_root_level;
        DROP INDEX IF EXISTS idx_backlog_fts;
    """))
    
    # Drop columns
    db.execute(text("""
        ALTER TABLE backlogs 
        DROP COLUMN IF EXISTS item_type,
        DROP COLUMN IF EXISTS root_id,
        DROP COLUMN IF EXISTS level,
        DROP COLUMN IF EXISTS path,
        DROP COLUMN IF EXISTS estimated_hours,
        DROP COLUMN IF EXISTS actual_hours,
        DROP COLUMN IF EXISTS due_date,
        DROP COLUMN IF EXISTS completed_at,
        DROP COLUMN IF EXISTS assigned_to_id
    """))
    
    db.commit()

def run_migration(db: Session, upgrade: bool = True):
    """Run the backlog optimization migration"""
    if upgrade:
        print("Upgrading backlog table with performance optimizations...")
        upgrade_backlog_table(db)
        print("Backlog table optimization completed successfully!")
    else:
        print("Downgrading backlog table...")
        downgrade_backlog_table(db)
        print("Backlog table downgrade completed successfully!") 