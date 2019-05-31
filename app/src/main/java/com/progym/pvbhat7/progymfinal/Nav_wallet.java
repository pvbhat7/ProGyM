package com.progym.pvbhat7.progymfinal;

import android.content.Intent;
import android.os.AsyncTask;
import android.support.v7.app.AppCompatActivity;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.EditText;
import android.widget.TextView;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Random;

public class Nav_wallet extends AppCompatActivity {

    Session session;
    String code="",referralCode;
    String url="https://goo.gl/idhxde";
    TextView referCode,money;
    String walletmoney;
    private FirebaseAuth auth;
    private static final int CODE_GET_REQUEST = 1024;
    private static final int CODE_POST_REQUEST = 1025;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_nav_wallet);
        referCode = (TextView) findViewById(R.id.referCode);
        money = (TextView) findViewById(R.id.textView12);
        auth = FirebaseAuth.getInstance();
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();

        session = new Session(getApplicationContext());

        //MODIFYING SESSION DATA
        if(!code.equalsIgnoreCase("false") || !walletmoney.equalsIgnoreCase("false"))
        {
            setData();
        }

        //
        //refer code stored in session then also generate new code and apply
        code=session.getReferralCode();
        walletmoney=session.getWalletMoney();


        if(code.equalsIgnoreCase("false") || walletmoney.equalsIgnoreCase("false"))
        {
            referCode.setText("- - - - -");
            money.setText("Rs. 0");
        }
        else
        {
            referCode.setText(code);
            money.setText(walletmoney);
        }

        //code=getReferralCode(user.getEmail());


    }

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

                    object = new JSONObject(s);

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
                    //Toast.makeText(getApplicationContext(), object.getString("message"), Toast.LENGTH_SHORT).show();
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

    public String getReferralCode(String email)
    {
        for(int i=0;i<2;i++)
        {
            referralCode=referralCode+email.charAt(i);
        }

        Random generator = new Random();
        int i1 = generator.nextInt(8) + 1;
        referralCode=referralCode+i1;

        int i2 = generator.nextInt(8) + 1;
        referralCode=referralCode+i2;

        int i3 = generator.nextInt(8) + 1;
        referralCode=referralCode+i3;

        return referralCode;
    }
    public void shareText(View view) {
        Intent intent = new Intent(android.content.Intent.ACTION_SEND);
        intent.setType("text/plain");
        String shareBodyText = "Hey,ever tried ProGym app ? click "+url+" or use my code "+code+" to" +
                " install the app. There is Rs.100 in your ProGym Credits " +
                "Balance." +
                "#HappyProGymBuddy";
        intent.putExtra(android.content.Intent.EXTRA_SUBJECT, "Subject/Title");
        intent.putExtra(android.content.Intent.EXTRA_TEXT, shareBodyText);
        startActivity(Intent.createChooser(intent, "Choose sharing method"));
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.action_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.share:

                Intent sharingIntent = new Intent(android.content.Intent.ACTION_SEND);
                sharingIntent.setType("text/plain");
                String shareBodyText = "Check it out. Your message goes here";
                sharingIntent.putExtra(android.content.Intent.EXTRA_SUBJECT,"Subject here");
                sharingIntent.putExtra(android.content.Intent.EXTRA_TEXT, shareBodyText);
                startActivity(Intent.createChooser(sharingIntent, "Shearing Option"));
                return true;

            default:
                return super.onOptionsItemSelected(item);
        }
    }
}
