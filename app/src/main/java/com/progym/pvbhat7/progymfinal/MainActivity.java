package com.progym.pvbhat7.progymfinal;

import android.app.FragmentTransaction;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.design.widget.BottomNavigationView;
import android.support.design.widget.NavigationView;
import android.support.v4.view.GravityCompat;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.ActionBarDrawerToggle;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.List;

public class MainActivity extends AppCompatActivity
        implements NavigationView.OnNavigationItemSelectedListener {
    private Button btnChangeEmail, btnChangePassword, btnSendResetEmail, btnRemoveUser,
            changeEmail, changePassword, sendEmail, remove, signOut;

    private EditText oldEmail, newEmail, password, newPassword;
    private ProgressBar progressBar;
    private FirebaseAuth.AuthStateListener authListener;
    private FirebaseAuth auth;

    public Session session;
    List<Hero> heroList;
    private static final int CODE_GET_REQUEST = 1024;
    private static final int CODE_POST_REQUEST = 1025;



    @Override
    protected void onCreate(Bundle savedInstanceState)
    {

        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_main);

        Toolbar toolbar = (Toolbar) findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        setupNavigationView();

        /*ImageView imageView = (ImageView) findViewById(R.id.imageView);
        ImageView imageView1 = (ImageView) findViewById(R.id.imageView1);
        ImageView imageView2 = (ImageView) findViewById(R.id.imageView2);
        Picasso.with(this)
                .load("https://scontent.fblr1-2.fna.fbcdn.net/v/t1.0-9/21557623_10155771059403559_7930407983112792888_n.jpg?oh=7eeb33d7376cd2d48d8f328bf384a19e&oe=5A3EB0CC")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.sd)      // optional
                .resize(1900,800)                        // optional
                .into(imageView);

        Picasso.with(this)
                .load("https://scontent.fblr1-2.fna.fbcdn.net/v/t1.0-9/21751322_10155759724643559_8830600844755927010_n.jpg?oh=031e9e4629f2853c94e7c3d4dfeb3f2b&oe=5A438CB4")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.sd)      // optional
                .resize(1900,800)                        // optional
                .into(imageView1);
        Picasso.with(this)
                .load("https://scontent.fblr1-2.fna.fbcdn.net/v/t1.0-9/21230910_1427049067409798_1868923014418656227_n.jpg?oh=369e5080872c31948d302a4a7c9b3681&oe=5A5266EA")
                .placeholder(R.drawable.load)   // optional
                .error(R.drawable.sd)      // optional
                .resize(1300,1000)                        // optional
                .into(imageView2);
*/
       /* FloatingActionButton fab = (FloatingActionButton) findViewById(R.id.fab);
        fab.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Snackbar.make(view, "Replace with your own action", Snackbar.LENGTH_LONG)
                        .setAction("Action", null).show();
            }
        });*/




        /*Button logout = (Button)findViewById(R.id.Logout);
        logout.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                signOut();
            }
        });*/


        //get firebase auth instance
        auth = FirebaseAuth.getInstance();

        //get current user
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
       /* TextView loggedin_user = (TextView) findViewById(R.id.loggedin_user);
        TextView email_loggedin = (TextView) findViewById(R.id.email_loggedin);
        loggedin_user.setText(user.getDisplayName());
        email_loggedin.setText(user.getEmail());*/

        /*View header = (View)getLayoutInflater().inflate(R.layout.nav_header_main, null);
        TextView loggedin_user = (TextView) header.findViewById(R.id.loggedin_user);
        loggedin_user.setText("llll");
        */


        System.out.println("*************************"+user.getEmail()+" ******** "+user.getDisplayName());
        authListener = new FirebaseAuth.AuthStateListener() {
            @Override
            public void onAuthStateChanged(@NonNull FirebaseAuth firebaseAuth) {
                FirebaseUser user = firebaseAuth.getCurrentUser();

                if (user == null) {
                    // user auth state is changed - user is null
                    // launch login activity
                    startActivity(new Intent(MainActivity.this, LoginActivity.class));
                    finish();
                }
            }
        };

        session = new Session(getApplicationContext()); //in oncreate



        // ONLINE WEBSITE CODE FOR SAVING DATA ON ONLINE HOSTED WEBSITE
        //readUserProfile(user.getEmail());

        final DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);

        ActionBarDrawerToggle toggle = new ActionBarDrawerToggle(
                this, drawer, toolbar, R.string.navigation_drawer_open, R.string.navigation_drawer_close){
            public void onDrawerClosed(View view) {

                invalidateOptionsMenu(); // creates call to onPrepareOptionsMenu()
            }

            public void onDrawerOpened(View drawerView) {

                drawer.bringToFront();
                drawer.requestLayout();
                invalidateOptionsMenu(); // creates call to onPrepareOptionsMenu()
            }
        };
        drawer.setDrawerListener(toggle);
        toggle.syncState();

        NavigationView navigationView = (NavigationView) findViewById(R.id.nav_view);
        navigationView.setNavigationItemSelectedListener(this);

        View header=navigationView.getHeaderView(0);
/*View view=navigationView.inflateHeaderView(R.layout.nav_header_main);*/

        TextView username = (TextView)header.findViewById(R.id.loggedin_user);
        username.setText(user.getEmail());

        if(session.getReferralCode().equalsIgnoreCase("false") || session.getWalletMoney().equalsIgnoreCase("false"))
        {
            setData();
        }




    }

/*
    public void comments()
    {
        */
/*int timeout = 10; // make the activity visible for 4 seconds

        Timer timer = new Timer();
        timer.schedule(new TimerTask() {

            @Override
            public void run() {
                finish();
                Intent homepage = new Intent(MainActivity.this,LoggedIn.class);
                startActivity(homepage);
            }
        }, timeout);
        btnChangeEmail = (Button) findViewById(R.id.change_email_button);
        btnChangePassword = (Button) findViewById(R.id.change_password_button);
        btnSendResetEmail = (Button) findViewById(R.id.sending_pass_reset_button);
        btnRemoveUser = (Button) findViewById(R.id.remove_user_button);
        changeEmail = (Button) findViewById(R.id.changeEmail);
        changePassword = (Button) findViewById(R.id.changePass);
        sendEmail = (Button) findViewById(R.id.send);
        remove = (Button) findViewById(R.id.remove);
        signOut = (Button) findViewById(R.id.sign_out);

        oldEmail = (EditText) findViewById(R.id.old_email);
        newEmail = (EditText) findViewById(R.id.new_email);
        password = (EditText) findViewById(R.id.password);
        newPassword = (EditText) findViewById(R.id.newPassword);

        oldEmail.setVisibility(View.GONE);
        newEmail.setVisibility(View.GONE);
        password.setVisibility(View.GONE);
        newPassword.setVisibility(View.GONE);
        changeEmail.setVisibility(View.GONE);
        changePassword.setVisibility(View.GONE);
        sendEmail.setVisibility(View.GONE);
        remove.setVisibility(View.GONE);

        progressBar = (ProgressBar) findViewById(R.id.progressBar);

        if (progressBar != null) {
            progressBar.setVisibility(View.GONE);
        }

        btnChangeEmail.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                oldEmail.setVisibility(View.GONE);
                newEmail.setVisibility(View.VISIBLE);
                password.setVisibility(View.GONE);
                newPassword.setVisibility(View.GONE);
                changeEmail.setVisibility(View.VISIBLE);
                changePassword.setVisibility(View.GONE);
                sendEmail.setVisibility(View.GONE);
                remove.setVisibility(View.GONE);
            }
        });

        changeEmail.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                progressBar.setVisibility(View.VISIBLE);
                if (user != null && !newEmail.getText().toString().trim().equals("")) {
                    user.updateEmail(newEmail.getText().toString().trim())
                            .addOnCompleteListener(new OnCompleteListener<Void>() {
                                @Override
                                public void onComplete(@NonNull Task<Void> task) {
                                    if (task.isSuccessful()) {
                                        Toast.makeText(MainActivity.this, "Email address is updated. Please sign in with new email id!", Toast.LENGTH_LONG).show();
                                        signOut();
                                        progressBar.setVisibility(View.GONE);
                                    } else {
                                        Toast.makeText(MainActivity.this, "Failed to update email!", Toast.LENGTH_LONG).show();
                                        progressBar.setVisibility(View.GONE);
                                    }
                                }
                            });
                } else if (newEmail.getText().toString().trim().equals("")) {
                    newEmail.setError("Enter email");
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        btnChangePassword.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                oldEmail.setVisibility(View.GONE);
                newEmail.setVisibility(View.GONE);
                password.setVisibility(View.GONE);
                newPassword.setVisibility(View.VISIBLE);
                changeEmail.setVisibility(View.GONE);
                changePassword.setVisibility(View.VISIBLE);
                sendEmail.setVisibility(View.GONE);
                remove.setVisibility(View.GONE);
            }
        });

        changePassword.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                progressBar.setVisibility(View.VISIBLE);
                if (user != null && !newPassword.getText().toString().trim().equals("")) {
                    if (newPassword.getText().toString().trim().length() < 6) {
                        newPassword.setError("Password too short, enter minimum 6 characters");
                        progressBar.setVisibility(View.GONE);
                    } else {
                        user.updatePassword(newPassword.getText().toString().trim())
                                .addOnCompleteListener(new OnCompleteListener<Void>() {
                                    @Override
                                    public void onComplete(@NonNull Task<Void> task) {
                                        if (task.isSuccessful()) {
                                            Toast.makeText(MainActivity.this, "Password is updated, sign in with new password!", Toast.LENGTH_SHORT).show();
                                            signOut();
                                            progressBar.setVisibility(View.GONE);
                                        } else {
                                            Toast.makeText(MainActivity.this, "Failed to update password!", Toast.LENGTH_SHORT).show();
                                            progressBar.setVisibility(View.GONE);
                                        }
                                    }
                                });
                    }
                } else if (newPassword.getText().toString().trim().equals("")) {
                    newPassword.setError("Enter password");
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        btnSendResetEmail.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                oldEmail.setVisibility(View.VISIBLE);
                newEmail.setVisibility(View.GONE);
                password.setVisibility(View.GONE);
                newPassword.setVisibility(View.GONE);
                changeEmail.setVisibility(View.GONE);
                changePassword.setVisibility(View.GONE);
                sendEmail.setVisibility(View.VISIBLE);
                remove.setVisibility(View.GONE);
            }
        });

        sendEmail.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                progressBar.setVisibility(View.VISIBLE);
                if (!oldEmail.getText().toString().trim().equals("")) {
                    auth.sendPasswordResetEmail(oldEmail.getText().toString().trim())
                            .addOnCompleteListener(new OnCompleteListener<Void>() {
                                @Override
                                public void onComplete(@NonNull Task<Void> task) {
                                    if (task.isSuccessful()) {
                                        Toast.makeText(MainActivity.this, "Reset password email is sent!", Toast.LENGTH_SHORT).show();
                                        progressBar.setVisibility(View.GONE);
                                    } else {
                                        Toast.makeText(MainActivity.this, "Failed to send reset email!", Toast.LENGTH_SHORT).show();
                                        progressBar.setVisibility(View.GONE);
                                    }
                                }
                            });
                } else {
                    oldEmail.setError("Enter email");
                    progressBar.setVisibility(View.GONE);
                }
            }
        });

        btnRemoveUser.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                progressBar.setVisibility(View.VISIBLE);
                if (user != null) {
                    user.delete()
                            .addOnCompleteListener(new OnCompleteListener<Void>() {
                                @Override
                                public void onComplete(@NonNull Task<Void> task) {
                                    if (task.isSuccessful()) {
                                        Toast.makeText(MainActivity.this, "Your profile is deleted:( Create a account now!", Toast.LENGTH_SHORT).show();
                                        startActivity(new Intent(MainActivity.this, SignupActivity.class));
                                        finish();
                                        progressBar.setVisibility(View.GONE);
                                    } else {
                                        Toast.makeText(MainActivity.this, "Failed to delete your account!", Toast.LENGTH_SHORT).show();
                                        progressBar.setVisibility(View.GONE);
                                    }
                                }
                            });
                }
            }
        });

        signOut.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                signOut();
            }
        });*//*

    }

*/
public void setData()
{
    final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
    readUserProfile(user.getEmail());
}
    private void readUserProfile(String email) {
        PerformNetworkRequest request = new PerformNetworkRequest(Api.URL_READ_USER_PROFILE + email, null, CODE_GET_REQUEST);
        request.execute();
    }
    class PerformNetworkRequest extends AsyncTask<Void, Void, String> {
        String url;
        HashMap<String, String> params;
        int requestCode;

        PerformNetworkRequest(String url, HashMap<String, String> params, int requestCode) {
            this.url = url;
            this.params = params;
            this.requestCode = requestCode;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
            //progressBar.setVisibility(View.VISIBLE);
        }

        @Override
        protected void onPostExecute(String s) {
            super.onPostExecute(s);

            //progressBar.setVisibility(GONE);
            try {
                JSONObject object = null;
                try {
                    object = new JSONObject(s);
                } catch (JSONException e) {
                    e.printStackTrace();
                }

                if (!object.getBoolean("error")) {



                    //JSONArray singleuser=object.getJSONArray("users");
                    User fetchedUser=null;



                    JSONObject obj = object.getJSONObject("users");


                    fetchedUser = new User(
                            obj.getInt("id"),
                            obj.getString("email"),
                            obj.getString("password"),
                            obj.getString("walletmoney"),
                            obj.getString("status"),
                            obj.getString("referralcode")
                    );

                    String money="Rs. "+fetchedUser.getWalletMoney();
                    session.setWalletMoney(money);
                    session.setReferralCode(fetchedUser.getReferralcode());
                    //Toast.makeText(getAp  plicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
                    //refreshSingleUser(object.getJSONArray("users"));
                }
            } catch (JSONException e) {
                //editTextName = (EditText) findViewById(R.id.editTextName);
                //editTextName.setText("error");
                e.printStackTrace();
            }
        }

        @Override
        protected String doInBackground(Void... voids) {
            RequestHandler requestHandler = new RequestHandler();

            if (requestCode == CODE_POST_REQUEST)
                return requestHandler.sendPostRequest(url, params);


            if (requestCode == CODE_GET_REQUEST)
                return requestHandler.sendGetRequest(url);

            return null;
        }
    }
    /*private void refreshSingleUser(JSONArray singleuser) throws JSONException {
        //heroList.clear();
        User fetchedUser=null;


        for (int i = 0; i < singleuser.length(); i++) {
            JSONObject obj = singleuser.getJSONObject(i);

            fetchedUser = new User(
                    obj.getInt("id"),
                    obj.getString("firstname"),
                    obj.getString("lastname"),
                    obj.getString("email"),
                    obj.getString("password"),
                    obj.getString("mobile"),
                    obj.getString("walletmoney"),
                    obj.getString("status")
            );
        }

        System.out.println("*********^^^ "+fetchedUser.toString());
*/


/*HeroAdapter adapter = new HeroAdapter(heroList);
        listView.setAdapter(adapter);*//*

        //setUserProfile(fetchedUser);
    }

*/

    private void setupNavigationView() {

        BottomNavigationView bottomNavigationView = (BottomNavigationView) findViewById(R.id.navigation);

        if (bottomNavigationView != null)
        {

            // Select first menu item by default and show Fragment accordingly.
            Menu menu = bottomNavigationView.getMenu();
            selectFragment(menu.getItem(0));

            // Set action to perform when any menu-item is selected.
            bottomNavigationView.setOnNavigationItemSelectedListener(
                    new BottomNavigationView.OnNavigationItemSelectedListener() {
                        @Override
                        public boolean onNavigationItemSelected(@NonNull MenuItem item) {
                            selectFragment(item);
                            return false;
                        }
                    });
        }

    }


    /**
     * Perform action when any item is selected.
     *
     * @param item Item that is selected.
     */
    protected void selectFragment(MenuItem item) {

        item.setChecked(true);

        switch (item.getItemId()) {
            case R.id.navigation_home:
                System.out.println("inside option 1 selected");

                final FragmentTransaction ft = getFragmentManager().beginTransaction();
                ft.replace(R.id.frame_layout, new GamesFragment());
                ft.commit();


                break;
            case R.id.navigation_dashboard:
                System.out.println("inside option 2 selected");

                final FragmentTransaction ft1 = getFragmentManager().beginTransaction();
                ft1.replace(R.id.frame_layout, new MoviesFragment());
                ft1.commit();


                break;
            case R.id.navigation_notifications:
                System.out.println("inside option 3 selected");
                final FragmentTransaction ft2 = getFragmentManager().beginTransaction();
                ft2.replace(R.id.frame_layout, new NotiFragment());
                ft2.commit();

                break;
        }
    }

    //sign out method
    public void signOut() {
        session.setFlag("invalid");
        auth.signOut();
    }

    @Override
    public void onBackPressed() {
        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        if (drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawer(GravityCompat.START);
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // Handle action bar item clicks here. The action bar will
        // automatically handle clicks on the Home/Up button, so long
        // as you specify a parent activity in AndroidManifest.xml.
        int id = item.getItemId();

        //noinspection SimplifiableIfStatement
        if (id == R.id.action_settings) {
            return true;
        }

        return super.onOptionsItemSelected(item);
    }

    @SuppressWarnings("StatementWithEmptyBody")
    @Override
    public boolean onNavigationItemSelected(MenuItem item) {
        System.out.println(item.getItemId());
        // Handle navigation view item clicks here.
        int id = item.getItemId();

        /*if (id == R.id.profile) {
            System.out.println("inside nav item 1");
            Intent intent = new Intent(getApplicationContext(),MyProfile.class);
            startActivity(intent);

            // Handle the camera action
        }*/
        /*if (id == R.id.profile) {
            System.out.println("inside nav item 1");
            *//*Intent intent = new Intent(getApplicationContext(),MyProfileDisplay.class);
            startActivity(intent);*//*

            // Handle the camera action
        }
        else if (id == R.id.nav_camera) {
            System.out.println("inside nav item 1");
            //Intent intent = new Intent(getApplicationContext(),CreateDiscount.class);
            //startActivity(intent);


            *//*

            this is for crud operations from online database

            Intent intent = new Intent(getApplicationContext(),CRUD.class);
            startActivity(intent);*//*

            // Handle the camera action
        }*/
        if (id == R.id.credits_btn) {
            System.out.println("inside nav item 2");
            Intent intent = new Intent(getApplicationContext(),Credits.class);
            startActivity(intent);

        }
        /*else if (id == R.id.nav_gallery) {
            System.out.println("inside nav item 2");
            Intent intent = new Intent(getApplicationContext(),Coupons.class);
            startActivity(intent);

        }*/ else if (id == R.id.Logout_btn)
        {
            System.out.println("inside nav item 3");
            session.setReferralCode("false");
            session.setWalletMoney("false");
            signOut();
            Toast toast=Toast.makeText(getApplicationContext(),"Hello 3",Toast.LENGTH_SHORT);
            /*System.out.println("__________________logout");
            Button logout = (Button)findViewById(R.id.Logout_btn);
            logout.setOnClickListener(new View.OnClickListener()
            {
                @Override
                public void onClick(View v) {
                    signOut();
                }
            });*/

        }
        else if(id==R.id.aboutus_btn){
            Intent intent = new Intent(getApplicationContext(),Nav_maps.class);
            startActivity(intent);
        }
        else if(id==R.id.progymwallet_btn){
            Intent intent = new Intent(getApplicationContext(),Nav_wallet.class);
            startActivity(intent);
        }
        else if(id==R.id.gallery_btn){
            Intent intent = new Intent(getApplicationContext(),Nav_gallery.class);
            startActivity(intent);
        }




        DrawerLayout drawer = (DrawerLayout) findViewById(R.id.drawer_layout);
        drawer.closeDrawer(GravityCompat.START);
        return true;
    }
    @Override
    protected void onResume() {
        super.onResume();
        //progressBar.setVisibility(View.GONE);
    }

    @Override
    public void onStart() {
        super.onStart();
        auth.addAuthStateListener(authListener);
    }

    @Override
    public void onStop() {
        super.onStop();
        if (authListener != null) {
            auth.removeAuthStateListener(authListener);
        }
    }

}
