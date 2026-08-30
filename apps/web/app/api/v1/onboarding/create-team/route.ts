import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';
import { setUserTokenCookie } from '@/lib/services/session-token';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const teamName = body.team_name?.trim();
    const productName = body.product_name?.trim();
    const productDesc = body.description?.trim() || `Main product for ${teamName}`;

    if (!teamName || teamName.length < 1 || teamName.length > 255) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Team name is required (1–255 characters)' }, { status: 400 });
    }

    if (!productName || productName.length < 1 || productName.length > 64) {
      return NextResponse.json({ error: 'VALIDATION_ERROR', message: 'Initial product name is required (1–64 characters)' }, { status: 400 });
    }

    // 1. Promote user to Admin, set team_name, and mark onboarded
    await db.query(
      `UPDATE users 
       SET team_name = $1, is_admin = TRUE, onboarded = TRUE 
       WHERE id = $2`,
      [teamName, user.id]
    );

    // 2. Ensure classification exists
    let classId: number;
    const classRes = await db.query(`SELECT id FROM classifications LIMIT 1`);
    if (classRes.rows.length > 0) {
      classId = Number(classRes.rows[0].id);
    } else {
      const newClass = await db.query(
        `INSERT INTO classifications (name, sortkey) VALUES ($1, 0) RETURNING id`,
        [`${teamName} Products`]
      );
      classId = Number(newClass.rows[0].id);
    }

    // 3. Create initial product (or reuse if existing)
    let productId: number;
    const prodExisting = await db.query(`SELECT id FROM products WHERE LOWER(name) = LOWER($1)`, [productName]);
    if (prodExisting.rows.length > 0) {
      productId = Number(prodExisting.rows[0].id);
    } else {
      const prodRes = await db.query(
        `INSERT INTO products (name, classification_id, description, default_milestone)
         VALUES ($1, $2, $3, '1.0')
         RETURNING id`,
        [productName, classId, productDesc]
      );
      productId = Number(prodRes.rows[0].id);
    }

    // 4. Create default components for this product
    const defaultComponents = ['General UI', 'Core Engine / API', 'Networking & Storage'];
    for (const compName of defaultComponents) {
      await db.query(
        `INSERT INTO components (name, product_id, description)
         VALUES ($1, $2, $3)
         ON CONFLICT (product_id, name) DO NOTHING`,
        [compName, productId, `Default ${compName} component for ${productName}`]
      );
    }

    // 5. Assign user to all core teams (dev-team, security-team, qa-team)
    const coreGroups = ['dev-team', 'security-team', 'qa-team'];
    for (const gName of coreGroups) {
      let gid: string;
      const gRes = await db.query(`SELECT id FROM groups WHERE name = $1`, [gName]);
      if (gRes.rows.length > 0) {
        gid = gRes.rows[0].id;
      } else {
        const insRes = await db.query(
          `INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id`,
          [gName, `${gName} members`]
        );
        gid = insRes.rows[0].id;
      }

      await db.query(
        `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, gid]
      );
    }

    const safeUser = {
      ...user,
      is_admin: true,
      onboarded: true,
      team_name: teamName,
      groups: coreGroups,
    };

    const response = NextResponse.json({
      success: true,
      message: `Team "${teamName}" created successfully! You are now the workspace administrator.`,
      redirect: '/dashboard',
      user: safeUser,
    });

    // Update signed session cookie with new admin & onboarding state
    setUserTokenCookie(response, safeUser);

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
