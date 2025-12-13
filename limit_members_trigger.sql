-- Function to check member limit
create or replace function check_club_member_limit()
returns trigger as $$
declare
    member_count int;
begin
    -- Count current members for the club
    select count(*) into member_count
    from club_members
    where club_id = new.club_id;

    -- If count is already 30 or more (should strictly be < 30 before insert), raise error.
    -- Note: member_count includes the rows existing *before* this insert.
    if member_count >= 30 then
        raise exception 'Club limit reached: A club can have a maximum of 30 members.';
    end if;

    return new;
end;
$$ language plpgsql;

-- Trigger to execute before insert
drop trigger if exists enforce_club_member_limit on club_members;

create trigger enforce_club_member_limit
before insert on club_members
for each row
execute function check_club_member_limit();
