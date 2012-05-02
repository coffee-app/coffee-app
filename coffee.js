
var ROOT = "Content/";
var MENU_ROOT = ROOT + "menu/";
var USER_ROOT = ROOT + "users/";
var PROD_ROOT = ROOT + "products/";

var pages = new Object ()	//	Name, Image
pages ["guidelines"] = Array ("Guidelines", MENU_ROOT + "coffee_machine128.png");
pages ["booking"] = Array ("Booking", MENU_ROOT + "shopping_cart128.png");
pages ["payments"] = Array ("Payments", MENU_ROOT + "coins128.png");
pages ["statistics"] = Array ("Statistics", MENU_ROOT + "line_chart128.png");
pages ["cleaning"] = Array ("Maintenance", MENU_ROOT + "service_manager128.png");

var cleaningSteps = [
	[ "descale", "Descale machine" ],
	[ "clean brewing unit", "Clean brewing unit" ],
	[ "clean waste container", "Clean waste container from mold" ],
	[ "clean drip tray", "Clean drip tray" ],
	[ "vacuum inside", "Vacuum inside of machine" ],
	[ "clean outside", "Clean machine body" ]
];

var currentPage = "";
var currentSubpage = null;
var scrolling = false;
var allowClicks = true;

//var dbg = window.open ("", "debug_log", "top=0,left=0,height=200,width=50,location=0,status=no,toolbar=no,resizable=yes,scrollbars=yes");
//setInterval ("dbg.document.body.scrollTop += 100", 1000);

var users = Array (
	//	Index is equal to the UID
    //     Name, Image, Balance, Small Image
);

var all_users = Array (
	//	Index is equal to the UID
    //     Name
);

var products = Array (
	//	Index is equal to the PID
    //     Name, Image, Price
);

var all_products = Array (
	//	Index is equal to the PID
    //     Name, Image, Price
);

var cn = new ActiveXObject("ADODB.Connection");
cn.Open ("Provider=Microsoft.ACE.OLEDB.12.0; Data Source=D:/Projects/Coffee/Content/Coffee.accdb;");





function GetShortDate (d)
{
    var short_month = Array ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
    var dd = new Date (d);
    return short_month [dd.getMonth ()] + " " + dd.getDate () + ", " + dd.getFullYear ();
}

function GetNiceDateAndTime (d)
{
    var dd = new Date (d);
    var diff = (new Date () - dd) / 1000;
    var hour = 3600;

    if (diff >= 0 && diff < 6 * hour)
    {
    	if (diff < 30)
    		return "<span style='color:red;'>just now</span>";
    	else if (diff < hour)
    		return Math.round (diff / 60) + " min ago";
    	else
    	{
			var h = Math.round (diff / hour);
			if (h == 1)
				return "1 hour ago";
			else
				return h + " hours ago";
		}
	}
    else
    	return GetShortDate (d);
}

function GetLongDate (d)
{
    var long_month = Array ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December");
    var dd = new Date (d);
    var suffix = "th";

    switch (dd.getDate ())
    {
        case 1:
        case 21:
        case 31:
            suffix = "st";
            break;
        case 2:
        case 22:
            suffix = "nd";
            break;
        case 3:
        case 23:
            suffix = "rd";
            break;
    }

    return long_month [dd.getMonth ()] + " " + dd.getDate () + "<superscript>" + suffix + "</superscript>, " + dd.getFullYear ()   ;
}

function DateDiffWeek (d1, d2)
{
	var millisecondsPerDay = 1000 * 60 * 60 * 24;
    var millisBetween = d2.getTime () - d1.getTime ();
    var days = millisBetween / millisecondsPerDay;
	return Math.floor (days / 7);
}

function DateToKw (d)
{
	var thisDate = new Date (d);
	var firstWeek = new Date (thisDate.getFullYear (), 0, 4);
	firstWeek.setDate (firstWeek.getDate () - (firstWeek.getDay () - 1));
	thisDate.setDate (thisDate.getDate () - (thisDate.getDay () - 1));

	var kw = parseInt ((thisDate.getTime () - firstWeek.getTime ()) / (7 * 24 * 60 * 60 * 1000)) + 1;
	return kw;
}

function GetDateFromYearAndKW (yyyy, kw)
{
	//	January 4 is always the date where week #1 is in. But we actually
	//	want the Monday of that week, which may be anything between
	//	January 1 and January 4.
	//	To get Monday, we subtract the day-value (Monday=1). To get to the
	//	Monday of our week, we add 7 times as many days, as we want weeks.

	var firstWeek = new Date (yyyy, 0, 4);
	firstWeek.setDate (firstWeek.getDate () - (firstWeek.getDay () - 1) + (7 * kw - 7));
	return firstWeek;
}

//	see http://javascript.jstruebig.de/javascript/35
function StripHTML (str, rpl)
{
	// remove all string within tags
	var tmp = str.replace(/(<.*['"])([^'"]*)(['"]>)/g, 
	function(x, p1, p2, p3) { return  p1 + p3;}
	);
	// now remove the tags
	return tmp.replace(/<\/?[^>]+>/gi, rpl);
}

function UpdateTime ()
{
	var d = new Date ();
	var h = d.getHours ();
	var m = d.getMinutes ();

	if (h < 10) h = "0" + h;
	if (m < 10) m = "0" + m;

	document.getElementById ("time").innerText = h + ":" + m;
}

function FormatCurrency (c)
{
	return "&euro; " + parseFloat (c).toFixed (2);
}

function GetUserNameById (uid)
{
	for (var id in all_users)
	{
		if (id == uid)
			return all_users [id];
	}

	return "[Unknown User]";
}

function ToggleFlag (elem, bit)
{
    var flags = parseInt (elem.getAttribute ("data-flags"));
    flags = flags ^ bit;
    elem.setAttribute ("data-flags", flags);
}

function NeedUpdate (p)
{
	return document.getElementById (p).getAttribute ("data-flags") != 0;
}

function MarkAsUpdated (p)
{
	document.getElementById (p).getAttribute ("data-flags", 0);
}

function MarkForUpdate ()
{
	document.getElementById ("booking").setAttribute ("data-flags", 1);
	document.getElementById ("payments").setAttribute ("data-flags", 1);
	document.getElementById ("cleaning").setAttribute ("data-flags", 1);
}

function RGB (val)
{
	var col = val.toString (16);
	return "#" + "000000".substr (0, 6 - col.length) + col;
}

function BalanceColor(bal)
{
	//	range color from -10 Euro to +15 Euro
	var minBal = -8;
	var maxBal = +15;

	var halfRange = (maxBal - minBal) / 2;
	var midBal = (maxBal + minBal) / 2;
	var col = 255 / halfRange * Math.min (Math.abs (bal - midBal), halfRange);

	return RGB((bal < midBal) ? (col << 16) : ((col * .8) << 8));
}

function AbsoluteOffset (div)
{
    var pos = { x:0, y:0 };
    while (div)
    {
        pos.x += div.offsetLeft;
        pos.y += div.offsetTop;
        div = div.offsetParent;
    }
    return pos;
}

function ResizeContent ()
{
    var mnu = document.getElementById ("menu");
    var cnt = document.getElementById ("content");

    var winH = 800;
    if (document.body && document.body.offsetWidth)
        winH = document.body.offsetHeight;
    if (document.compatMode=='CSS1Compat' &&
        document.documentElement &&
        document.documentElement.offsetHeight)
    {
        winH = document.documentElement.offsetHeight;
    }
    if (window.innerWidth && window.innerHeight)
        winH = window.innerHeight;

    var contentHeight = winH - mnu.offsetHeight;
    if (cnt.offsetHeight != contentHeight)
        cnt.style.height = cnt.style.maxHeight = contentHeight;
}


function _kpad (elem, code)
{
    var inp = elem.parentNode.parentNode.firstChild.firstChild.firstChild;
    switch (code)
    {
        case '-':
            if (inp.value == "")
                inp.value += code;
            break;
        case ',':
            if (inp.value.indexOf ('.') == -1)
                inp.value += '.';
            break;
        case '\b':
            inp.value = inp.value.substr (0, inp.value.length - 1);
            break;
        case '\n':
            var fn = elem.parentNode.parentNode.parentNode.parentNode.getAttribute ("action");
            var arg = elem.parentNode.parentNode.parentNode.parentNode.getAttribute ("action_arg");

            eval (fn + "(" + inp.value + ", " + arg + ")");
            break;
        default:
            inp.value += code;
            break;
    }
}

function GetKeypad (id, param)
{
    var kpad = document.createElement ("div");
    kpad.setAttribute ("id", id);
    kpad.innerHTML = '\
        <table class="numblock" cellspacing="10">\
            <tr><th colspan="3"><input type="text" readonly="readonly" onfocus="this.blur ();" /></th><td class="button" style="height:30pt; line-height:28pt;" ondblclick="_kpad(this,\'\b\');" onclick="_kpad(this,\'\b\');">&larr;</td></tr>\
            <tr><td class="button" ondblclick="_kpad(this,\'1\');" onclick="_kpad(this,\'1\');">1</td><td class="button" ondblclick="_kpad(this,\'2\');" onclick="_kpad(this,\'2\');">2</td><td class="button" ondblclick="_kpad(this,\'3\');" onclick="_kpad(this,\'3\');">3</td><td class="button" rowspan="3" ondblclick="return false;" onclick="' + id + '_Change(this.parentNode.parentNode.firstChild.firstChild.firstChild.value, ' + param + ');">&crarr;</td></tr>\
            <tr><td class="button" ondblclick="_kpad(this,\'4\');" onclick="_kpad(this,\'4\');">4</td><td class="button" ondblclick="_kpad(this,\'5\');" onclick="_kpad(this,\'5\');">5</td><td class="button" ondblclick="_kpad(this,\'6\');" onclick="_kpad(this,\'6\');">6</td></tr>\
            <tr><td class="button" ondblclick="_kpad(this,\'7\');" onclick="_kpad(this,\'7\');">7</td><td class="button" ondblclick="_kpad(this,\'8\');" onclick="_kpad(this,\'8\');">8</td><td class="button" ondblclick="_kpad(this,\'9\');" onclick="_kpad(this,\'9\');">9</td></tr>\
            <tr><td class="button" colspan="2" ondblclick="_kpad(this,\'0\');" onclick="_kpad(this,\'0\');">0</td><td class="button" ondblclick="_kpad(this,\',\');" onclick="_kpad(this,\',\');">,</td><td class="button" ondblclick="return false;" onclick="_kpad(this,\'-\');">-</td></tr>\
        </table>';
    return kpad;
}

function FillStdUserInfo (id, div)
{
    div.innerText = '';
    div.appendChild (BuildListItem ("", users, id));
    div.firstChild.firstChild.src = users [id] [3];

    var bal = users [id] [2];
	var sz = Math.min(-Math.min (bal - 3, 0),20) + 14; //	range size from +3 Euro to -inf Euro

    var tbl = document.createElement ("div");
    tbl.innerHTML = "<table class='listing'><tr><th colspan='2'>&nbsp;</th></tr><tr><td align='left'>Balance</td><td align='right'><span style='color: " + BalanceColor(bal) + "; font-size: " + sz + "pt; font-weight: " + (bal < 0 ? "bold" : "normal") + "'>" + FormatCurrency (bal) + "</span></td></tr></table>";
    div.appendChild (tbl);
}

function BuildListItem (name, data, id, args, modfn, hasSubList)
{
    var label = data [id] [0];
    var img = data [id] [1];

    var itm = document.createElement('div');
    var ico = document.createElement('img');
    var lbl= document.createElement('div');

	var baseLabelLen = label.indexOf (';');
	if (baseLabelLen >= 0)
		label = label.substr (0, baseLabelLen);

    ico.src = img;
    lbl.innerHTML = label;

    if (name != "")
    {
        var a = document.createElement('span');

        itm.setAttribute ("id", name + "" + id + "");
        lbl.setAttribute ("id", name + "Label" + id + "");

		if (baseLabelLen >= 0)
    	    a.setAttribute ("onclick", "if (allowClicks)" +  name + "_SubMenu ('" + id + "'" + (typeof args != 'undefined' ? ", " + args : "") + ");");
    	else
    	    a.setAttribute ("onclick", "if (allowClicks)" +  name + "_Click ('" + id + "'" + (typeof args != 'undefined' ? ", " + args : "") + ");");
        a.setAttribute ("hidefocus", "hidefocus");
        a.appendChild (ico);
        a.appendChild (lbl);

        itm.appendChild (a);

		if (typeof modfn != 'undefined' && !hasSubList)
			modfn (itm, id);
    }
    else
    {
        itm.appendChild (ico);
        itm.appendChild (lbl);
    }
    return itm;
}

function AddUserBalance (div, id)
{
	var a = div.childNodes [0];

    var overlay = document.createElement('div');
    {
    	overlay.setAttribute ("style", "position: absolute; width: 100%; text-align: right; color: " + BalanceColor(users [id] [2]) + ";");
    	overlay.innerHTML = FormatCurrency (users [id] [2]);
    }
    a.insertBefore (overlay, a.childNodes [0]);
}

function AddProdPrice (div, id)
{
	var lbl = div.childNodes [0].childNodes [1];
	lbl.innerHTML += "<br /><span class='price'>" + FormatCurrency (products [id] [2]) + "</span>";
}

function BuildList (div, name, data, args, modfn)
{
	var subs = new Array ();

    div.innerHTML = '';
    for (var id in data)
    {
    	var baseLabelLen = data [id] [0].indexOf (';');
    	if (baseLabelLen >= 0)
    	{
    		var baseLabel = data [id] [0].substr (0, baseLabelLen);
    		var exists = false;
		    for (var s in subs)
    		{
    			if (subs [s] == baseLabel)
    			{
    				exists = true;
    				break;
    			}
    		}
    		if (!exists)
    			subs.push (baseLabel);
    		else
    			continue;
    	}
        div.appendChild (BuildListItem (name, data, id, args, modfn, baseLabelLen >= 0));
    }
}

function ScrollList ()
{
/*    arg = this.id + ":   " + event.type + "  fired at " + event.clientX + "x" + event.clientY + " with widths: " + this.scrollWidth + " " + this.clientWidth + " " + this.offsetWidth + " " + this.style.width + " and heights "  + this.scrollHeight + " " + this.clientHeight + " " + this.offsetHeight + " " + this.style.height;
*/
    if (this.scrollHeight <= this.offsetHeight)
        return;

    var updateScrollPos = false;
    switch (event.type)
    {
        case "mousedown":
            scrolling = true;
            this.setAttribute ("dragStartX", window.event.clientX);
            this.setAttribute ("dragStartY", window.event.clientY);
            this.setAttribute ("dragInitScrollX", this.scrollLeft);
            this.setAttribute ("dragInitScrollY", this.scrollTop);
            window.event.srcElement.setCapture ();
            break;
        case "mousemove":
            if (scrolling)
            {
            	if (Math.abs (this.getAttribute ("dragStartX") - window.event.clientX) > 16 ||
            		Math.abs (this.getAttribute ("dragStartY") - window.event.clientY) > 16)
            	{
		            allowClicks = false;
		        }
                updateScrollPos = true;
            }
            break;
        case "mouseup":
        case "up":
			scrolling = false;
            setTimeout ('allowClicks = true;', 100);
            updateScrollPos = true;
            document.releaseCapture ();
            break;
        default:
	        alert (event.type);
        break;
    }

    if (updateScrollPos)
    {
        this.scrollTop = this.getAttribute ("dragInitScrollY") - (window.event.clientY - this.getAttribute ("dragStartY"));
        this.scrollLeft = this.getAttribute ("dragInitScrollX") - (window.event.clientX - this.getAttribute ("dragStartX"));
    }

    window.event.cancelBubble = true;
    window.event.returnValue = false;
}



window.onload = function ()
{
    BuildList (document.getElementById ("menuItemlist"), "menu", pages);
    menu_Click ("guidelines");
    ResizeContent ();

    {
        var div = document.getElementById ("content");
        div.onmousedown = ScrollList;
        div.onmousemove = ScrollList;
        div.onmouseup = ScrollList;
    }

	var rs = new ActiveXObject("ADODB.Recordset");
	var rs2 = new ActiveXObject("ADODB.Recordset");

    //  load users
	rs.Open ("select UID,First,Last,Image,Balance from by_UserInfo", cn);
    users = new Array ();
    while (!rs.EOF)
    {
        users [parseInt (rs (0))] = new Array ( rs (1) + "<br />" + rs (2), USER_ROOT + rs (3), parseFloat (rs(4)).toFixed (2), USER_ROOT + "large/" + rs (3) );
        rs.MoveNext ();
    }
    rs.Close();

	rs.Open ("select ID,First,Last from Users", cn);
    all_users = new Array ();
    while (!rs.EOF)
    {
    	var user_name = String (rs (1));
    	if (String (rs(2)) != "")
    		user_name += " " + rs (2);

        all_users [parseInt (rs (0))] = user_name;
        rs.MoveNext ();
    }
    rs.Close();

    //  load active products
	rs.Open ("select PID, Description, Price, Image from by_ActiveProducts", cn);
    products = new Array ();
    while (!rs.EOF)
    {
        products [parseInt (rs (0))] = new Array (String(rs (1)), PROD_ROOT + rs (3), parseFloat (rs (2)).toFixed (2) );
        rs.MoveNext ();
    }
    rs.Close ();

    //  load all products
	rs.Open ("select ID, Description, Price, Image from Products", cn);
    all_products = new Array ();
    while (!rs.EOF)
    {
        all_products [parseInt (rs (0))] = new Array (String(rs (1)), PROD_ROOT + rs (3), parseFloat (rs (2)).toFixed (2) );
        rs.MoveNext ();
    }
    rs.Close ();

	UpdateTime ();
	window.setInterval ("UpdateTime ();", 60000);
}

window.onresize = ResizeContent;

//  NOTE: This will prevent text-selection and image-dragging
//        to give the impression of a more robust interface
document.onselectstart = function () {return false;};
document.ondragstart = function () {return false;};



function menu_Click (newPage)
{
    var nid = newPage;

    document.getElementById (nid).style.display = '';

    if (currentSubpage != null)
    {
        currentSubpage.style.display = 'none';
        currentSubpage = null;
    }

    if (newPage != currentPage)
	{
		document.getElementById ("content").scrollTop = 0;
	
		document.getElementById ("menu" + newPage).style.borderColor = '#c0c0c0';
		document.getElementById ("menu" + newPage).style.backgroundColor = '#e0eaff';
		document.getElementById ("menuLabel" + newPage).style.color = '#05e';
	
		if (currentPage != "")
		{
			var oid = currentPage;
	
			document.getElementById (oid).style.display = 'none';
			document.getElementById ("menu" + currentPage).style.borderColor = '#fff';
			document.getElementById ("menu" + currentPage).style.backgroundColor = '';
			document.getElementById ("menuLabel" + currentPage).style.color = '';
		}
		currentPage = newPage;
	}
    eval ("show_" + nid + " ();");
}

function show_guidelines ()
{
}

function show_booking ()
{
	if (NeedUpdate ("booking"))
	{
		MarkAsUpdated ("booking");
	    BuildList (document.getElementById ("bookingUserlist"), "bookingUserlist", users, undefined, AddUserBalance);
	}
}

function show_payments ()
{
	if (NeedUpdate ("payments"))
	{
		MarkAsUpdated ("payments");
	    BuildList (document.getElementById ("paymentsUserlist"), "paymentsUserlist", users, undefined, AddUserBalance);
	}
}

function show_cleaning ()
{
	if (NeedUpdate ("cleaning"))
	{
		MarkAsUpdated ("cleaning");
	    BuildList (document.getElementById ("cleaningUserlist"), "cleaningUserlist", users);
	}
}

function show_statistics ()
{
    var div = document.getElementById ("statisticsList");
    div.innerText = '';

    {
        var itm = document.createElement('div');
        var a = document.createElement ('span');

        a.innerText = "Coffees per user over the last year";
        a.setAttribute ("onclick", "statUserCoffee_Click ('" + a.innerText + "', 'by_StatCoffee1y', 'statisticsCoffeeYear');");
        a.setAttribute ("hidefocus", "hidefocus");

        itm.appendChild (a);
        div.appendChild (itm);
    }

    {
        var itm = document.createElement('div');
        var a = document.createElement ('span');

        a.innerText = "Coffees per user over the last month";
        a.setAttribute ("onclick", "statUserCoffee_Click ('" + a.innerText + "', 'by_StatCoffee30d', 'statisticsCoffeeMonth');");
        a.setAttribute ("hidefocus", "hidefocus");

        itm.appendChild (a);
        div.appendChild (itm);
    }

    {
        var itm = document.createElement('div');
        var a = document.createElement ('span');

        a.innerText = "Coffees per week over the last year (top 5 users)";
        a.setAttribute ("onclick", "statUserCoffeeWeek_Click ('" + a.innerText + "');");
        a.setAttribute ("hidefocus", "hidefocus");

        itm.appendChild (a);
        div.appendChild (itm);
    }

    {
        var itm = document.createElement('div');
        var a = document.createElement ('span');

        a.innerText = "Distribution of current user balance";
        a.setAttribute ("onclick", "statUserBalance_Click ('" + a.innerText + "', 'statisticsBalance');");
        a.setAttribute ("hidefocus", "hidefocus");

        itm.appendChild (a);
        div.appendChild (itm);
    }

    {
        var itm = document.createElement('div');
        var a = document.createElement ('span');

        a.innerText = "Recent cleanings per user";
        a.setAttribute ("onclick", "statUserCleanings_Click ('" + a.innerText + "', 'statisticsCleanings');");
        a.setAttribute ("hidefocus", "hidefocus");

        itm.appendChild (a);
        div.appendChild (itm);
    }
}



function ShowSubpage (divid)
{
    currentSubpage = document.getElementById (divid);

    currentSubpage.style.display = '';
    document.getElementById (currentPage).style.display = 'none';
}

function bookingUserlist_Click (i)
{
    FillStdUserInfo (i, document.getElementById ("bookingUserInfo"));

    {
	    var rs = new ActiveXObject("ADODB.Recordset");
        var usr_details = document.getElementById ("bookingUserDetails");
                
        str = "\
        <table class='listing'>\
            <tr>\
                <th colspan='4'>Bookings</th>\
            </tr>\
            <tr style='font-weight: bold;'>\
                <td>Product</td><td align='center'>#</td><td align='right'>Total</td><td align='right'>Last booked</td>\
            </tr>";
        {
            //  load users
	        rs.Open ("select PID, TotalBookings, TotalPrice, LastBooked FROM by_UserBookings WHERE UID=" + i, cn);
	        if (rs.EOF)
	        {
                    str += "\
                <tr>\
                    <td colspan='4' align='center'>No bookings yet</td>\
                </tr>\
                    ";
	        }
	        else
	        {
	        	var total_price = 0;
                while (!rs.EOF)
                {
                	var idx = parseInt (rs (0));
                    var name = all_products [idx] [0];
                    var price = FormatCurrency (rs (2));

					total_price += parseFloat (rs (2));

                    if (name.indexOf (';') >= 0)
                        name = name.substr (0, name.indexOf (';')) + " (" + name.substr(name.indexOf (';') + 1) + ")";

                    str += "\
                <tr>\
                    <td>" + name + "</td><td align='center'>" + rs (1) + "</td><td align='right'>" + price + "</td><td align='right'>" + GetNiceDateAndTime (rs (3)) + "</td>\
                </tr>\
                    ";

                    rs.MoveNext ();
                }
                str += "\
                <tr>\
                    <td><b>Total</b></td><td align='center'></td><td align='right'><b>" + FormatCurrency (parseFloat (total_price).toFixed (2)) + "</b></td><td align='right'></td>\
                </tr>\
                    ";
            }
            rs.Close();
        }

        {
            //  load last payment
            var lpay = "No payments yet";
	        rs.Open ("select LastPayment from by_UserPayments where UID=" + i, cn);
            if (!rs.EOF && rs (0).Value != null) lpay = GetLongDate (rs (0));
            rs.Close ();

            str += "\
            </table>\
            <table class='bookingUserDetails_LastPayment'>\
                <tr>\
                    <th>Last Payment</th><th>" + lpay +  "</th>\
                </tr>\
            </table>\
            ";
        }

        usr_details.innerHTML = str;
    }

    {
        var usr_options = document.getElementById ("bookingUserOptions");
        usr_options.innerHTML = "<div class='listing_header'>Products</div>";
        usr_options.style.height = document.getElementById ("content").offsetHeight - 40;

        var prod_list = document.createElement ("div");
        prod_list.className = "icon_container";
        BuildList (prod_list, "bookingProductlist", products, i, AddProdPrice);
        usr_options.appendChild (prod_list);

        usr_options.onmousedown = ScrollList;
        usr_options.onmousemove = ScrollList;
        usr_options.onmouseup = ScrollList;
    }

    ShowSubpage ("bookingUser");
}

function paymentsUserlist_Click (i)
{
    FillStdUserInfo (i, document.getElementById ("paymentsUserInfo"));

    {
	    var rs = new ActiveXObject("ADODB.Recordset");
        var usr_details = document.getElementById ("paymentsUserDetails");
                
        str = "\
        <table class='listing'>\
            <tr>\
                <th colspan='4'>Payments</th>\
            </tr>\
            <tr style='font-weight: bold;'>\
                <td>Date</td><td align='right'>Amount</td>\
            </tr>";

        var have_data = false;
        {
            var total_payments = 0

            //  load payments
	        rs.Open ("select TIME, AMOUNT from PAYMENTS where UID=" + i, cn);
            while (!rs.EOF)
            {
                str += "\
            <tr>\
                <td>" + GetLongDate (rs (0)) + "</td><td align='right'>" + FormatCurrency (rs (1)) + "</td>\
            </tr>\
                ";

				total_payments += parseFloat (rs (1));
                have_data = true;
                rs.MoveNext ();
            }
            str += "\
            <tr>\
                <td><b>Total</b></td><td align='right'><b>" + FormatCurrency (parseFloat (total_payments).toFixed (2)) + "</b></td>\
            </tr>\
                ";
            rs.Close();
        }
        if (!have_data)
        {
            str += "\
            <tr>\
                <td colspan='4' align='center'>No payments yet</td>\
            </tr>\
            ";
        }
        str += "\
        </table>\
        ";

        usr_details.innerHTML = str;
    }

    document.getElementById ("paymentsUserOptions").innerText = "";
    document.getElementById ("paymentsUserOptions").appendChild (GetKeypad ("paymentsKeypad", i));

    ShowSubpage ("paymentsUser");
}

function cleaningUserlist_Click (i)
{
	var rs = new ActiveXObject("ADODB.Recordset");

    {
        var usr_info = document.getElementById ("cleaningUserInfo");

        usr_info.innerText = '';
        usr_info.appendChild (BuildListItem ("", users, i));
	    usr_info.firstChild.firstChild.src = users [i] [3];

        //  load last cleaning for this user
        var your_last_clean = "Never";
        rs.Open ("select max(TIME) from Maintenance where UID=" + i, cn);
        if (!rs.EOF && rs (0).Value != null) your_last_clean = GetShortDate (rs (0));
        rs.Close ();

        var last_clean = "Never";
        rs.Open ("select max(TIME) from Maintenance", cn);
        if (!rs.EOF && rs (0).Value != null) last_clean = GetShortDate (rs (0));
        rs.Close ();

        var tbl = document.createElement ("div");
        tbl.innerHTML = "<table class='listing'><tr><th colspan='2'>&nbsp;</th></tr><tr><td align='left'>Last Cleaning</td><td align='right'>" + last_clean + "</td></tr><tr><td align='left'>Your Last Cleaning</td><td align='right'>" + your_last_clean + "</td></tr></table>";
        usr_info.appendChild (tbl);
    }

    {
        var usr_details = document.getElementById ("cleaningUserDetails");
/*
        <table class='listing'>\
            <tr>\
                <th>Current bonus for cleaning</th>\
            </tr>\
            <tr>\
                <td style='text-align: justify; white-space: normal;'>When descaling, you will receive a bonus <i>for each</i> cleaning step. The amount of this bonus depends on the number of coffees consumed since the last descaling of the machine.</td>\
            </tr>\
            <tr style='text-align: right'>\
                <td>" + FormatCurrency (cleaning_bonus) + "</td>\
            </tr>\
        </table>\
        <br />\
        <br />\
*/                
        str = "\
        <table class='listing'>\
            <tr>\
                <th colspan='4'>Cleanings by you</th>\
            </tr>\
            <tr style='font-weight: bold;'>\
                <td>Date</td><td align='right'>Steps taken</td>\
            </tr>";

        var have_data = false;
        {
            //  load cleanings
	        rs.Open ("select TYPE, TIME from Maintenance where UID=" + i, cn);
            while (!rs.EOF)
            {
                var d = GetLongDate (rs (1));
                var type = parseInt (rs (0));
                var str_type = "";

				var c = 1;
				for (var j in cleaningSteps)
				{
    	            if ((type & c) == c)
	                    str_type = str_type + cleaningSteps [j] [0] + ", ";
					c *= 2;
				}

                if (str_type == "")
                    str_type = "none";
                else
                    str_type = str_type.substr (0, str_type.length - 2);

                str += "\
            <tr>\
                <td nowrap>" + d + "</td><td align='right' style='white-space: normal;'>" + str_type + "</td>\
            </tr>\
                ";

                have_data = true;
                rs.MoveNext ();
            }
            rs.Close();
        }
        if (!have_data)
        {
            str += "\
            <tr>\
                <td colspan='2' align='center'>No cleanings yet</td>\
            </tr>\
            ";
        }
        str += "\
        </table>\
        ";

        usr_details.innerHTML = str;
    }

    {
        var usr_options = document.getElementById ("cleaningUserOptions");
        var str = '\
            <table class="listing" style="position: relative; width: 300px;" data-flags="0">\
                <tr><th colspan="2">Cleaning steps</th></tr>\
                <tr><td colspan="2" style="padding-top: 10px; font-size: 14pt; line-height: 20pt; text-align: justify; white-space: normal;">Please use this check list to mark each step you are undertaking during the cleaning process. When you have finished the whole cleaning procedure, click "Done".</td></tr>\
                <tr><td colspan="2">&nbsp;</td></tr>'

		var c = 1;
		for (var j in cleaningSteps)
		{
			str += '\
                <tr><td><input type="checkbox" id="cleaningUserOption' + c + '"/ onclick="ToggleFlag (this.parentNode.parentNode.parentNode.parentNode, ' + c + ');"></td><td><label for="cleaningUserOption' + c + '">' + cleaningSteps [j] [1] + '</label></td></tr>\
			';
			c *= 2;
		}

        str += '\
                <tr><td colspan="2"><div class="button" style="margin: 40pt;" onclick="cleaningDone_Click (this.parentNode.parentNode.parentNode.parentNode, ' + i + ');">Done</div></td></tr>\
            </table>\
        ';

        usr_options.innerHTML = str;

    }

    ShowSubpage ("cleaningUser");
}




function bookingProductlist_SubMenu (product_index, user_index)
{
	var baseNameLen = products [product_index] [0].indexOf (';');
	var baseName = products [product_index] [0].substr (0, baseNameLen);
	var popup = document.getElementById ("popup");
	var src = document.getElementById ("bookingProductlist" + product_index);
	var srcPos = AbsoluteOffset (src);

	popup.style.left = srcPos.x;
	popup.style.top = srcPos.y + src.offsetHeight;

	var itms = '';
	for (var id in products)
	{
		if (products [id] [0].substr (0, baseNameLen) == baseName)
			itms += "<tr><td><a onclick='if (allowClicks)bookingProductlist_Click (" + id + ", " + user_index + ");'>" + products [id] [0].substr (baseNameLen + 1) + "</td><td class='price'>" + FormatCurrency (products [id] [2]) + "</td></tr>";
	}

	popup.innerHTML = '<table>' + itms + '</table>';

	document.getElementById ("overlay").style.display = '';
}

function bookingProductlist_Click (product_index, user_index)
{
	users [user_index] [2] -= products [product_index] [2];
	cn.Execute ("insert into BOOKINGS (UID, PID, Price) values (" + user_index + ", " + product_index + ", " + products [product_index] [2] + ")");
	MarkForUpdate ();
	bookingUserlist_Click (user_index);
}

function paymentsKeypad_Change (value, user_index)
{
    value = parseFloat (value).toFixed (2);
    var str_value = ("" + value).replace ('.', ',');
    users [user_index] [2] -= -value;

    cn.Execute ("insert into PAYMENTS (UID, AMOUNT) values (" + user_index + ", '" + str_value + "')");
	MarkForUpdate ();
    paymentsUserlist_Click (user_index);
}

function cleaningDone_Click (lst, user_index)
{
    cn.Execute ("insert into Maintenance (UID, TYPE) values (" + user_index + ", '" + lst.getAttribute ("data-flags") + "')");
    cleaningUserlist_Click (user_index);
}

function statUserCoffee_Click (ttl, qry, page)
{
    var rs = new ActiveXObject("ADODB.Recordset");
    var str = "<div class='barchart'><div class='title'>" + ttl + "</div>";
    var tot_cnt = 0;
    var has_rows = false;
    var factor = 1;

    //  load coffee stats
    rs.Open ("select * from " + qry, cn);
    while (!rs.EOF)
    {
        var uid = parseInt (rs (0));
        var cnt = parseInt (rs (1));
        var user_name = GetUserNameById (uid);

        //  Scale all values so that the biggest bar is 500px wide.
        //  Since we know that the first value is the biggest, do
        //  the following only at the very beginning. In other words,
        //  if we do not have rows yet, this must be the first one.
        if (!has_rows)
        {
            factor = 500.0 / cnt;
            has_rows = true;
        }

        tot_cnt += cnt;

        str += "\
            <div class='row'>\
            	<div class='label'>" + user_name + "</div>\
				<div style='display: table-cell;'>\
					<img src='Content/trans.png' class='bar' style='width: " + (cnt * factor) + "px;' />\
				</div>\
            	<div class='bardata'>" + cnt + (cnt > 1 ? " coffees" : " coffee") + "</div>\
            </div>\
        ";

        rs.MoveNext ();
    }
    rs.Close();

    if (!has_rows)
        str += "<div class='row' style='text-align: center;'>No statistics.</div>"
    else
    {
        str += "\
            <div class='lastrow'>\
            	<div class='label'></div>\
            	<div class='total'>Total</div>\
            	<div class='bardata'>" + tot_cnt + (tot_cnt > 1 ? " coffees" : " coffee") + "</div>\
            </div>\
        ";
    }

    str += "</div>";

    document.getElementById (page).innerHTML = str;
    ShowSubpage (page);
}

function statUserBalance_Click (ttl, page)
{
    var rs = new ActiveXObject("ADODB.Recordset");
    var str = "<div class='barchart'><div class='title'>" + ttl + "</div>";
    var tot_plus = 0;
    var tot_minus = 0;
    var has_rows = false;
    var factor = 5;

	var max = 5;
    for (var id in users)
    {
    	if (max < Math.abs (users [id] [2]))
    		max = Math.abs (users [id] [2]);
    }
    factor = 250 / max;
	

    //  load coffee stats
    rs.Open ("select * from by_StatUserBalance", cn);
    while (!rs.EOF)
    {
        var uid = parseInt (rs (0));
        var bal = parseFloat (rs (1));
        var user_name = GetUserNameById (uid);

        if (bal >= 0)
        {
	        tot_plus += bal;
            str += "\
                <div class='row'>\
                	<div class='label'>" + user_name + "</div>\
                	<div style='display: table-cell;'>\
                		<img src='Content/trans.png' width='250' height='1' />\
                		<img src='Content/trans.png' class='bar' style='width: " + (bal * factor) + "px;' />\
                	</div>\
                	<div class='bardata' style='text-align: right; color: green;'>" + FormatCurrency (bal) + "</div>\
                </div>\
            ";
        }
        else
        {
	        tot_minus += bal;
            str += "\
                <div class='row'>\
                	<div class='label'>" + user_name + "</div>\
                	<div style='display: table-cell;'>\
	                	<img src='Content/trans.png' width='" + (248 - (-bal * factor)) + "' height='1' />\
	                	<img src='Content/trans.png' class='bar' style='width: " + (-bal * factor) + "px;' />\
                	</div>\
                	<div class='bardata' style='text-align: right; color: red;'>" + FormatCurrency (bal) + "</div>\
                </div>\
            ";
        }

        rs.MoveNext ();
    }
    rs.Close();

    //  if 'first' hasn't changed, we did not get any entries
    if (has_rows)
        str += "<div class='row' style='text-align: center;'>No statistics.</div>"
    else
    {
        str += "\
            <div class='lastrow'>\
            	<div class='label'></div>\
            	<div class='subtotal'>Total credit</div>\
            	<div class='subtotal bardata'>" + FormatCurrency (tot_plus) + "</div>\
            </div>\
            <div class='lastrow'>\
            	<div class='label'></div>\
            	<div class='subtotal'>Total dept</div>\
            	<div class='subtotal bardata'>" + FormatCurrency (tot_minus) + "</div>\
            </div>\
            <div class='lastrow' style='border-bottom: solid #e0e0e0 1px;'>\
            	<div class='label'></div>\
            	<div class='total'>Total</div>\
            	<div class='total bardata'>" + FormatCurrency (tot_plus + tot_minus) + "</div>\
            </div>\
        ";
    }

    str += "</div>";

    document.getElementById (page).innerHTML = str;
    ShowSubpage (page);
}

function statUserCleanings_Click (ttl, page)
{
    var rs = new ActiveXObject("ADODB.Recordset");
    var lstDone = "";
    var lstToDo = "";
    var hasCleanedList = [];

    //  load coffee stats
    rs.Open ("select * from by_StatClean01", cn);
    while (!rs.EOF)
    {
        var uid = parseInt (rs (0));
        var user_name = GetUserNameById (uid);

		lstDone += "\
			<div class='row'>\
				<div class='label'>" + user_name + "</div>\
				<div style='display: table-cell; text-align: right;'>" + GetNiceDateAndTime (rs (1)) + "</div>\
			</div>\
		";

		hasCleanedList.push (uid);
		rs.MoveNext ();
    }
    rs.Close ();

    rs.Open ("select * from by_StatCoffee1y LEFT JOIN Users ON by_StatCoffee1y.UID = Users.ID where Users.MUST_CLEAN = True", cn);
    while (!rs.EOF)
	{
        var uid = parseInt (rs (0));
        var cnt = parseInt (rs (1));

		if (cnt > 50)
		{
			var hasCleaned = false;
			for (var id in hasCleanedList)
			{
				if (hasCleanedList [id] == uid)
				{
					hasCleaned = true;
					break;
				}
			}

			if (!hasCleaned)
			{
				var user_name = GetUserNameById (uid);
				
				lstToDo += "\
					<div class='row'>\
						<div class='label'>" + user_name + "</div>\
						<div style='display: table-cell; text-align: right;'>never</div>\
					</div>\
				";
			}
		}
		rs.MoveNext ();
	}
    rs.Close ();

    document.getElementById (page).innerHTML = "\
					<div class='barchart'><div class='title'>" + ttl + "</div>\
						" + lstToDo + "\
						" + lstDone + "\
					</div>\
				";
    ShowSubpage (page);
}

function statUserCoffeeWeek_Click (ttl)
{
//var t0 = new Date();
	var div = document.getElementById ("statisticsCoffee");
	div.childNodes (0).innerText = ttl;
	div.childNodes (1).innerText = '';
	div.childNodes (2).innerText = '';

	//	BUG: the canvas won't work when the display-style is set to 'none'
	div.style.visibility = 'hidden';
	div.style.display = '';


	//	load data
	var firstWeek = new Date ();
	var lastWeek = new Date ();
	var previousWeek = new Date ();
	var data = [];
	{
		var lastUid = -1;
		var uidWeeks = [];

		var rs = new ActiveXObject("ADODB.Recordset");
		rs.Open ("select UID, Year, Week, Count from by_StatCoffeeW", cn);
		while (!rs.EOF)
		{
			thisWeek = GetDateFromYearAndKW (parseInt (rs (1)), parseInt (rs (2)));
			if (lastWeek < thisWeek)
				lastWeek = thisWeek;
			if (firstWeek > thisWeek)
				firstWeek = thisWeek;

			var thisUid = parseInt (rs (0));
			if (lastUid < 0)
				lastUid = thisUid;

			if (lastUid != thisUid)
			{
				data.push ({ label: StripHTML (users [lastUid] [0], " "), data: uidWeeks});

				lastUid = thisUid;
				uidWeeks = new Array ();
				previousWeek = new Date ();
			}

			while (DateDiffWeek (previousWeek, thisWeek) > 1)
			{
//				dbg.document.writeln (previousWeek + "<br />");
				previousWeek.setDate (previousWeek.getDate () + 7);
				uidWeeks.push (new Array (previousWeek - 24*3600000, 0.1));
			}
			previousWeek = thisWeek;

			uidWeeks.push (new Array (thisWeek - 24*3600000, parseInt (rs (3))));
			rs.MoveNext ();
		}
		rs.Close();

		if (lastUid >= 0)
			data.push ({ label: StripHTML (users [lastUid] [0], " "), data: uidWeeks});
	}
//dbg.document.write("<br/ >load: time used (msecs): " + ((new Date()).getTime() - t0.getTime()));
//t0 = new Date ();

	var options = {
		xaxis: { mode: "time", tickFormatter: DateToKw, tickSize: [7, "day"] },
		series: {
			lines: { show: true, steps: true },
//			lines: { show: true },
			shadowSize: 0
		},
		legend: { backgroundOpacity: 0 },
		selection: { mode: "x" }
	};


	var plot = $.plot("#graph", data, options);

//dbg.document.write("<br/ >plot G: time used (msecs): " + ((new Date()).getTime() - t0.getTime()));
//t0 = new Date ();

	var overview = $.plot($("#overview"), data, {
		legend: { show: false },
		series: {
			lines: { show: true, steps: true, lineWidth: 1 },
			shadowSize: 0
		},
		xaxis: { ticks: [] },
		yaxis: { ticks: [], min: 0, autoscaleMargin: 0.1 },
		selection: { mode: "x" }
	});

// dbg.document.write("<br/ >plot O: time used (msecs): " + ((new Date()).getTime() - t0.getTime()));
// t0 = new Date ();

	// now connect the two
	$("#graph").bind("plotselected", function (event, ranges) {
		// do the zooming
		plot = $.plot($("#graph"), data,
					  $.extend(true, {}, options, {
						  xaxis: { min: ranges.xaxis.from, max: ranges.xaxis.to }
					  }));

		// don't fire event on the overview to prevent eternal loop
		overview.setSelection(ranges, true);
	});
	
	$("#overview").bind("plotselected", function (event, ranges) {
		plot.setSelection(ranges);
	});
	$("#overview").bind("plotunselected", function () {
		plot = $.plot($("#graph"), data,
					  $.extend(true, {}, options, {
						  xaxis: { min: firstWeek, max: lastWeek }
					  }));
		overview.clearSelection(true);
	});

// dbg.document.write("<br/ >connect: time used (msecs): " + ((new Date()).getTime() - t0.getTime()));

	div.style.visibility = '';
    ShowSubpage ("statisticsCoffee");
}
